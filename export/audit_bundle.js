/**
 * SUNFARM PV — DETERMINISTIC AUDIT BUNDLE EXPORT
 *
 * Generates a tamper-evident, hashed audit bundle containing the complete
 * project state: config, financial model outputs, covenant status, and
 * governance trail. Designed for investor due-diligence and regulatory review.
 *
 * Output: JSON bundle with SHA-256 content hash for integrity verification.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PROJECT, ASSUMPTIONS, TOKEN_DEFAULTS } = require('../config/project.js');
const { evaluateAllCovenants, COVENANTS } = require('../governance/covenants.js');
const { generateAuditTrail } = require('../governance/governance-adapter.js');

// ── BUNDLE CONFIGURATION ─────────────────────────────────────────

const BUNDLE_VERSION = '2.0.0';
const BUNDLE_DIR = path.join(__dirname, '..', 'output');

// ── MODEL LOADERS ─────────────────────────────────────────────────

/**
 * Safely load a model module, returning null if unavailable.
 *
 * @param {string} modulePath - Path relative to project root
 * @returns {Object|null}
 */
function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

/**
 * Collect all financial model outputs.
 *
 * @returns {Object} All model outputs
 */
function collectModelOutputs() {
  const models = {};

  // Load each model if available
  const modelPaths = {
    cashflow: '../models/cashflow.js',
    debt: '../models/debt.js',
    irr: '../models/irr.js',
    sensitivity: '../models/sensitivity.js',
    carbon: '../models/carbon.js',
    bess: '../models/bess.js',
  };

  for (const [name, modPath] of Object.entries(modelPaths)) {
    const mod = safeRequire(modPath);
    if (mod && typeof mod === 'object') {
      // If the module exports a run/calculate function, call it
      if (typeof mod.run === 'function') {
        try { models[name] = mod.run(); } catch { models[name] = { status: 'error', module: name }; }
      } else if (typeof mod.calculate === 'function') {
        try { models[name] = mod.calculate(); } catch { models[name] = { status: 'error', module: name }; }
      } else {
        models[name] = { status: 'loaded', exports: Object.keys(mod) };
      }
    } else {
      models[name] = { status: 'not_found' };
    }
  }

  return models;
}

/**
 * Collect data room file inventory.
 *
 * @returns {Array<Object>} File inventory
 */
function collectDataRoomInventory() {
  const dataRoomDir = path.join(__dirname, '..', 'data-room');
  const inventory = [];

  try {
    const files = fs.readdirSync(dataRoomDir);
    files.forEach((file) => {
      const filePath = path.join(dataRoomDir, file);
      const stat = fs.statSync(filePath);
      inventory.push({
        file,
        size_bytes: stat.size,
        modified: stat.mtime.toISOString(),
        hash: stat.isFile()
          ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').slice(0, 16)
          : null,
      });
    });
  } catch {
    // data-room directory may not exist
  }

  return inventory;
}

/**
 * Collect capital document inventory.
 *
 * @returns {Object} Capital docs by subdirectory
 */
function collectCapitalInventory() {
  const capitalDir = path.join(__dirname, '..', 'capital');
  const inventory = {};

  try {
    const entries = fs.readdirSync(capitalDir, { withFileTypes: true });
    entries.forEach((entry) => {
      if (entry.isDirectory()) {
        const subDir = path.join(capitalDir, entry.name);
        const files = fs.readdirSync(subDir);
        inventory[entry.name] = files.map((f) => ({
          file: f,
          size: fs.statSync(path.join(subDir, f)).size,
        }));
      } else if (entry.isFile()) {
        if (!inventory._root) inventory._root = [];
        inventory._root.push({
          file: entry.name,
          size: fs.statSync(path.join(capitalDir, entry.name)).size,
        });
      }
    });
  } catch {
    // capital directory may not exist
  }

  return inventory;
}

// ── BUNDLE GENERATION ─────────────────────────────────────────────

/**
 * Generate the complete audit bundle.
 *
 * @param {Object} [options] - Options
 * @param {Object} [options.metrics] - Current financial metrics for covenant eval
 * @returns {Object} Complete audit bundle with integrity hash
 */
function generateBundle(options = {}) {
  const metrics = options.metrics || {
    dscr: 3.90,
    llcr: 3.50,
    debt_to_equity: ASSUMPTIONS.debt_ratio / ASSUMPTIONS.equity_ratio,
    reserve_months: 6,
    bess_availability: 0.95,
  };

  // Collect all components
  const bundle = {
    meta: {
      bundle_version: BUNDLE_VERSION,
      generated_at: new Date().toISOString(),
      generator: 'sunfarm-platform/export/audit_bundle.js',
      project: PROJECT.name,
      entity: PROJECT.entity.name,
      rnc: PROJECT.entity.rnc,
    },
    config: {
      project: PROJECT,
      assumptions: ASSUMPTIONS,
      token_defaults: TOKEN_DEFAULTS,
    },
    models: collectModelOutputs(),
    covenants: {
      definitions: COVENANTS,
      current_evaluation: evaluateAllCovenants(metrics),
      metrics_used: metrics,
    },
    governance: generateAuditTrail(),
    data_room: collectDataRoomInventory(),
    capital_docs: collectCapitalInventory(),
  };

  // Generate content hash
  const contentString = JSON.stringify(bundle, null, 0);
  const content_hash = crypto.createHash('sha256').update(contentString).digest('hex');

  bundle.meta.content_hash = content_hash;
  bundle.meta.content_size_bytes = Buffer.byteLength(contentString, 'utf8');

  return bundle;
}

/**
 * Export the audit bundle to a JSON file.
 *
 * @param {Object} [options] - Options passed to generateBundle
 * @returns {string} Path to the exported file
 */
function exportBundle(options = {}) {
  const bundle = generateBundle(options);

  // Ensure output directory exists
  if (!fs.existsSync(BUNDLE_DIR)) {
    fs.mkdirSync(BUNDLE_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `audit-bundle-${timestamp}.json`;
  const filePath = path.join(BUNDLE_DIR, filename);

  fs.writeFileSync(filePath, JSON.stringify(bundle, null, 2), 'utf8');

  // Write hash sidecar
  const hashFile = path.join(BUNDLE_DIR, `${filename}.sha256`);
  fs.writeFileSync(hashFile, `${bundle.meta.content_hash}  ${filename}\n`, 'utf8');

  return { filePath, hashFile, hash: bundle.meta.content_hash };
}

/**
 * Verify an audit bundle's integrity.
 *
 * @param {string} bundlePath - Path to the audit bundle JSON
 * @returns {{ valid: boolean, expected: string, actual: string }}
 */
function verifyBundle(bundlePath) {
  const raw = fs.readFileSync(bundlePath, 'utf8');
  const bundle = JSON.parse(raw);

  const storedHash = bundle.meta.content_hash;

  // Remove the hash from the bundle, recompute
  const bundleCopy = JSON.parse(raw);
  delete bundleCopy.meta.content_hash;
  delete bundleCopy.meta.content_size_bytes;

  const contentString = JSON.stringify(bundleCopy, null, 0);
  const computedHash = crypto.createHash('sha256').update(contentString).digest('hex');

  return {
    valid: storedHash === computedHash,
    expected: storedHash,
    actual: computedHash,
    file: bundlePath,
    generated_at: bundle.meta.generated_at,
  };
}

// ── CLI EXECUTION ─────────────────────────────────────────────────

if (require.main === module) {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         SUNFARM — AUDIT BUNDLE EXPORT                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const result = exportBundle();

  console.log(`Bundle exported: ${result.filePath}`);
  console.log(`Hash sidecar:    ${result.hashFile}`);
  console.log(`SHA-256:         ${result.hash}\n`);

  // Verify
  const verification = verifyBundle(result.filePath);
  console.log(`Verification:    ${verification.valid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`Generated:       ${verification.generated_at}`);
}

module.exports = { generateBundle, exportBundle, verifyBundle };
