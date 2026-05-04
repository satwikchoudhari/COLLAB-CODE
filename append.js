const fs = require('fs');
const css = `
/* --- Hero Page --- */
.hero { flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; padding: 2rem; z-index: 10; }
.hero h1 { font-size: 4rem; margin-bottom: 1rem; background: linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero p { font-size: 1.25rem; color: var(--text-muted); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; }

/* --- Auth Page --- */
.auth-container { display: flex; align-items: center; justify-content: center; flex: 1; padding: 2rem; z-index: 10; }
.auth-card { width: 100%; max-width: 400px; }
.auth-toggle { cursor: pointer; color: var(--accent); font-weight: 600; }
.auth-toggle:hover { text-decoration: underline; }

/* --- Dashboard Page --- */
.dashboard-container { padding: 3rem 5%; max-width: 1200px; margin: 0 auto; flex: 1; width: 100%; z-index: 10; }
.room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
.room-card { padding: 1.5rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; cursor: pointer; transition: transform 0.2s; }
.room-card:hover { transform: translateY(-5px); border-color: rgba(255,255,255,0.15); background: rgba(30, 41, 59, 0.9); }
.room-card h3 { margin-bottom: 0.5rem; }

/* --- Editor Page --- */
.workspace { display: flex; height: calc(100vh - 75px); }
.sidebar { width: 250px; background: var(--bg-secondary); border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; z-index: 5; }
.sidebar-section { padding: 1rem; border-bottom: 1px solid var(--glass-border); flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.sidebar-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.sidebar-section-header h3 { margin: 0; font-size: 1.1rem; }
.file-list { flex: 1; overflow-y: auto; list-style: none; padding: 0; margin: 0; }
.main-pane { flex: 1; display: flex; flex-direction: column; }
#editor { flex: 1; min-height: 50vh; position: relative;}
.terminal-panel { height: 30%; background: #0a0a0a; border-top: 1px solid var(--glass-border); display: flex; flex-direction: column; z-index: 5;}
.terminal-header { background: #111; padding: 0.5rem 1rem; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; color: #fff;}
.terminal-output { flex: 1; padding: 1rem; font-family: 'Consolas', monospace; color: #94a3b8; overflow-y: auto; white-space: pre-wrap; font-size: 14px;}
.users-list { flex: 1; overflow-y: auto; }
.user-pill { background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.5rem; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.1);}
/* Cursor styling */
.remote-cursor { width: 2px; height: 1.2em; position: absolute; z-index: 9; animation: blink 1s step-end infinite; }
.remote-cursor-flag { position: absolute; top: -18px; left: 0; padding: 2px 6px; font-size: 10px; border-radius: 3px; color: white; white-space: nowrap; z-index: 10; pointer-events: none; opacity: 0.9; }
/* Video Container Styling */
#videoContainer { position: absolute; bottom: 20px; right: 20px; width: 350px; height: 250px; background: var(--bg-secondary); border: 1px solid var(--glass-border); border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 1000; display: flex; flex-direction: column; overflow: hidden; resize: both; }
#videoHeader { padding: 0.5rem; background: #111; border-bottom: 1px solid var(--glass-border); cursor: grab; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #ccc; }
#videoHeader:active { cursor: grabbing; }
#videoIframe { flex: 1; border: none; width: 100%; height: 100%; }
.close-btn { background: none; border: none; color: #ef4444; cursor: pointer; font-weight: bold; }
`;
fs.appendFileSync('client/css/style.css', css);
