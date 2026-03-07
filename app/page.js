import Script from "next/script";

const previewStyle = {
  "--viewer-preview": "url('/panoramas/playa-brava-jose-ignacio/playa-brava-jose-ignacio-equirect.jpg')"
};

export default function Page() {
  return (
    <>
      <main className="app-shell">
        <section className="viewer-shell" aria-label="360 panorama viewer">
          <div className="viewer-stage" data-viewer="" aria-live="polite" style={previewStyle}>
            <svg
              className="viewer-lot-overlay"
              id="lot-overlay"
              aria-hidden="true"
              preserveAspectRatio="none"
            />
            <div className="viewer-label-layer" id="lot-label-layer" aria-live="polite" />

            <div className="viewer-overlay viewer-copy">
              <p className="eyebrow">Interactive 360</p>
              <h1>Playa Brava Jose Ignacio</h1>
              <p className="lede">
                Drag to look around, use the wheel to zoom, and click a lot to open its real
                estate details.
              </p>
              <div className="meta-row">
                <span className="meta-pill">Local panorama asset</span>
                <span className="meta-pill" id="view-readout">
                  Yaw 0° · Zoom 75°
                </span>
              </div>
              <div className="mode-switch-shell">
                <p className="mode-switch-label">Demo mode</p>
                <div className="mode-switch" role="group" aria-label="View mode">
                  <button type="button" id="switch-to-public">
                    Customer
                  </button>
                  <button type="button" id="switch-to-admin">
                    Admin
                  </button>
                </div>
              </div>
            </div>

            <aside className="viewer-overlay lot-card" id="lot-card" hidden>
              <button type="button" className="card-dismiss" id="lot-card-close">
                Close
              </button>
              <p className="card-status" id="lot-card-status">
                Available
              </p>
              <h2 id="lot-card-title">Lote</h2>
              <p className="card-description" id="lot-card-description" hidden />
              <dl className="card-metrics">
                <div>
                  <dt>Area</dt>
                  <dd id="lot-card-area">-</dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd id="lot-card-price">-</dd>
                </div>
              </dl>
              <a
                id="lot-card-link"
                className="card-link"
                href="#"
                target="_blank"
                rel="noreferrer"
                hidden
              >
                Request info
              </a>
            </aside>

            <aside className="viewer-overlay admin-panel" id="admin-panel" hidden>
              <div className="admin-header">
                <p className="eyebrow">Admin mode</p>
                <h2>Lot editor</h2>
                <p className="admin-copy" id="admin-sync-state">
                  Changes stay in this browser until you publish.
                </p>
              </div>

              <div className="admin-actions">
                <button type="button" id="new-lot">
                  New lot
                </button>
                <button type="button" id="toggle-draw">
                  Start drawing
                </button>
                <button type="button" id="undo-point">
                  Undo point
                </button>
                <button type="button" id="clear-polygon">
                  Clear polygon
                </button>
              </div>

              <label className="field">
                <span>Name</span>
                <input id="lot-name" type="text" placeholder="Lote 1" />
              </label>

              <div className="field-grid">
                <label className="field">
                  <span>ID</span>
                  <input id="lot-id" type="text" readOnly />
                </label>
                <label className="field">
                  <span>Status</span>
                  <select id="lot-status" defaultValue="available">
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                  </select>
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Area (m²)</span>
                  <input id="lot-area" type="number" min="0" step="1" placeholder="850" />
                </label>
                <label className="field">
                  <span>Price (USD)</span>
                  <input id="lot-price" type="number" min="0" step="1000" placeholder="120000" />
                </label>
              </div>

              <label className="field">
                <span>Description</span>
                <textarea
                  id="lot-description"
                  rows="3"
                  placeholder="Lot description, frontage, and key details."
                />
              </label>

              <div className="field-grid">
                <label className="field">
                  <span>CTA label</span>
                  <input id="lot-link-label" type="text" placeholder="Request info" />
                </label>
                <label className="field">
                  <span>CTA URL</span>
                  <input id="lot-link" type="url" placeholder="https://wa.me/..." />
                </label>
              </div>

              <p className="admin-footnote" id="admin-point-readout">
                No polygon points yet. Turn on drawing and click on the land.
              </p>

              <div className="admin-actions admin-actions-secondary">
                <button type="button" id="save-lot">
                  Save lot
                </button>
                <button type="button" id="delete-lot">
                  Delete lot
                </button>
                <button type="button" id="publish-lots">
                  Publish locally
                </button>
              </div>

              <div className="lot-list-shell">
                <p className="lot-list-title">Existing lots</p>
                <div className="lot-list" id="lot-list" />
              </div>
            </aside>

            <button type="button" className="viewer-overlay mobile-admin-toggle" id="mobile-admin-toggle" hidden>
              Open editor
            </button>

            <div className="viewer-overlay viewer-toolbar" aria-label="Viewer controls">
              <button type="button" id="reset-view">
                Reset view
              </button>
              <button type="button" id="zoom-out">
                Zoom out
              </button>
              <button type="button" id="zoom-in">
                Zoom in
              </button>
              <button type="button" id="toggle-fullscreen">
                Fullscreen
              </button>
            </div>

            <div className="viewer-overlay viewer-status" id="viewer-status">
              Loading panorama...
            </div>

            <noscript>
              <div className="viewer-overlay viewer-status">
                JavaScript is required to use this 360 viewer.
              </div>
            </noscript>
          </div>
        </section>
      </main>

      <dialog className="confirm-dialog" id="confirm-dialog">
        <form method="dialog" className="confirm-sheet">
          <p className="eyebrow">Confirm</p>
          <h2 id="confirm-title">Delete lot?</h2>
          <p className="confirm-copy" id="confirm-copy">
            This removes the selected lot from the public dataset.
          </p>
          <div className="confirm-actions">
            <button type="submit" value="cancel">
              Cancel
            </button>
            <button type="submit" value="confirm" className="button-danger">
              Delete
            </button>
          </div>
        </form>
      </dialog>

      <Script src="/viewer.js" strategy="afterInteractive" type="module" />
    </>
  );
}
