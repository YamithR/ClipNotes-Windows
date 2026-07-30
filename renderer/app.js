let config = {};
let currentPath = '';
let listeningForShortcut = false;

const elems = {
  windowBar: document.getElementById('windowBar'),
  headerBar: document.getElementById('headerBar'),
  backBtn: document.getElementById('backBtn'),
  currentDir: document.getElementById('currentDir'),
  noFolder: document.getElementById('noFolder'),
  fileList: document.getElementById('fileList'),
  selectFolderBtn: document.getElementById('selectFolderBtn'),
  toast: document.getElementById('toast'),
  settingsBtn: document.getElementById('settingsBtn'),
  infoBtn: document.getElementById('infoBtn'),
  closeBtn: document.getElementById('closeBtn'),
  settingsModal: document.getElementById('settingsModal'),
  settingsClose: document.getElementById('settingsClose'),
  shortcutInput: document.getElementById('shortcutInput'),
  shortcutBtn: document.getElementById('shortcutBtn'),
  changeFolderBtn: document.getElementById('changeFolderBtn'),
  stripToggle: document.getElementById('stripToggle'),
  ontopToggle: document.getElementById('ontopToggle'),
  aboutModal: document.getElementById('aboutModal'),
  aboutClose: document.getElementById('aboutClose'),
  aboutContent: document.getElementById('aboutContent')
};

async function init() {
  config = await clipnotes.getConfig();
  applyConfigUI();
  if (config.path) {
    currentPath = config.path;
    await loadFolder(currentPath);
  }
  setupEventListeners();
  syncWindowSize();
}

function syncWindowSize() {
  if (config['window-width'] && config['window-height']) {
    document.body.style.width = config['window-width'] + 'px';
    document.body.style.height = config['window-height'] + 'px';
  }
}

async function loadFolder(dirPath) {
  try {
    const result = await clipnotes.listFiles(dirPath);
    if (!result || result.error) {
      showToast(result?.error || 'Error al leer la carpeta');
      return;
    }
    currentPath = dirPath;
    const files = result.files || [];
    const folders = result.dirs || [];
    showFiles(folders, files);
    elems.headerBar.classList.remove('hidden');
    elems.noFolder.classList.add('hidden');
    elems.fileList.classList.remove('hidden');
    elems.currentDir.textContent = dirPath;
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

function showFiles(folders, files) {
  const list = elems.fileList;
  list.innerHTML = '';
  if (folders.length === 0 && files.length === 0) {
    list.innerHTML = '<div style="padding:16px;text-align:center;color:rgba(255,255,255,0.3);font-size:12px;">Vacía</div>';
    return;
  }
  for (const f of folders) {
    const item = document.createElement('div');
    item.className = 'file-item folder';
    item.innerHTML = `<span class="fi-icon">📁</span><span class="fi-name">${esc(f.name)}</span>`;
    item.addEventListener('click', () => loadFolder(f.path));
    list.appendChild(item);
  }
  for (const f of files) {
    const item = document.createElement('div');
    item.className = 'file-item file';
    const displayName = config.strip ? f.name.replace(/\.\w+$/, '') : f.name;
    item.innerHTML = `<span class="fi-icon">📄</span><span class="fi-name">${esc(displayName)}</span><span class="fi-preview"></span>`;
    item.addEventListener('click', () => copyFileContent(f.path));
    list.appendChild(item);
  }
}

async function copyFileContent(filePath) {
  try {
    const result = await clipnotes.copyFile(filePath);
    if (result && result.success) {
      showToast('✓ Copiado al portapapeles');
    } else {
      showToast('Error al copiar');
    }
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

function showToast(msg) {
  elems.toast.textContent = msg;
  elems.toast.classList.remove('hidden');
  setTimeout(() => elems.toast.classList.add('hidden'), 2000);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function applyConfigUI() {
  elems.stripToggle.checked = config.strip !== false;
  elems.ontopToggle.checked = config['always-on-top'] !== false;
  elems.shortcutInput.value = config['shortcut-key'] || 'Ctrl+Shift+N';
}

function setupEventListeners() {
  elems.selectFolderBtn.addEventListener('click', async () => {
    const folder = await clipnotes.selectFolder();
    if (folder) {
      currentPath = folder;
      await loadFolder(folder);
    }
  });

  elems.backBtn.addEventListener('click', async () => {
    const parent = currentPath.split(/[\\/]/).slice(0, -1).join('/');
    if (parent && parent !== currentPath) {
      await loadFolder(parent);
    }
  });

  elems.closeBtn.addEventListener('click', () => {
    clipnotes.closeApp();
  });

  elems.settingsBtn.addEventListener('click', () => openSettings());
  elems.settingsClose.addEventListener('click', () => closeSettings());
  elems.settingsModal.addEventListener('click', (e) => {
    if (e.target === elems.settingsModal) closeSettings();
  });

  elems.infoBtn.addEventListener('click', () => openAbout());
  elems.aboutClose.addEventListener('click', () => closeAbout());
  elems.aboutModal.addEventListener('click', (e) => {
    if (e.target === elems.aboutModal) closeAbout();
  });

  elems.shortcutBtn.addEventListener('click', () => {
    listeningForShortcut = true;
    elems.shortcutInput.value = 'Presiona...';
    elems.shortcutInput.focus();
  });

  elems.shortcutInput.addEventListener('click', () => {
    listeningForShortcut = true;
    elems.shortcutInput.value = 'Presiona...';
    elems.shortcutInput.focus();
  });

  document.addEventListener('keydown', (e) => {
    if (listeningForShortcut) {
      e.preventDefault();
      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Super');
      const key = e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        parts.push(key.length === 1 ? key.toUpperCase() : key);
        const shortcut = parts.join('+');
        elems.shortcutInput.value = shortcut;
        listeningForShortcut = false;
        clipnotes.setShortcut(shortcut);
      }
    }
  });

  elems.changeFolderBtn.addEventListener('click', async () => {
    const folder = await clipnotes.selectFolder();
    if (folder) {
      currentPath = folder;
      await loadFolder(folder);
      closeSettings();
    }
  });

  elems.stripToggle.addEventListener('change', () => {
    config.strip = elems.stripToggle.checked;
    clipnotes.setConfig({ strip: config.strip });
    if (currentPath) loadFolder(currentPath);
  });

  elems.ontopToggle.addEventListener('change', () => {
    config['always-on-top'] = elems.ontopToggle.checked;
    clipnotes.setConfig({ 'always-on-top': config['always-on-top'] });
  });

  clipnotes.onOpenSettings(() => openSettings());
  clipnotes.onOpenAbout(() => openAbout());
  clipnotes.onRefresh(() => {
    syncWindowSize();
    if (currentPath) loadFolder(currentPath);
  });
}

async function openSettings() {
  applyConfigUI();
  elems.settingsModal.classList.remove('hidden');
}

function closeSettings() {
  elems.settingsModal.classList.add('hidden');
  listeningForShortcut = false;
}

async function openAbout() {
  const info = await clipnotes.getAppInfo();
  elems.aboutContent.innerHTML = `
    <div class="ab-title">${esc(info.name)}</div>
    <div class="ab-version">v${esc(info.version)}</div>
    <div>${esc(info.description)}</div>
    <div class="ab-section">Desarrollador</div>
    <div>${esc(info.author)}</div>
    <div><a href="mailto:${esc(info.email)}" class="ab-link">${esc(info.email)}</a></div>
    <div class="ab-section">GitHub</div>
    <div><a href="${esc(info.github)}" class="ab-link" target="_blank">${esc(info.github)}</a></div>
    <div class="ab-section">Repositorio</div>
    <div><a href="${esc(info.repo)}" class="ab-link" target="_blank">${esc(info.repo)}</a></div>
  `;
  elems.aboutModal.classList.remove('hidden');
}

function closeAbout() {
  elems.aboutModal.classList.add('hidden');
}

init();
