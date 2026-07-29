const api = window.clipnotes;

let currentPath = '';
let rootPath = '';
let config = {};

function $(id) { return document.getElementById(id); }

async function init() {
  config = await api.getConfig();
  rootPath = config.path || '';

  setupEventListeners();

  if (rootPath) {
    await loadFiles();
  } else {
    showNoFolder();
  }

  api.onRefresh(async () => {
    config = await api.getConfig();
    rootPath = config.path || '';
    currentPath = '';
    if (rootPath) {
      hideNoFolder();
      await loadFiles();
    } else {
      showNoFolder();
    }
  });
}

function setupEventListeners() {
  $('closeBtn').addEventListener('click', () => window.close());
  $('backBtn').addEventListener('click', goBack);
  $('selectFolderBtn').addEventListener('click', selectFolder);
  $('settingsBtn').addEventListener('click', selectFolder);
}

async function selectFolder() {
  const folder = await api.selectFolder();
  if (folder) {
    rootPath = folder;
    config.path = folder;
    currentPath = '';
    hideNoFolder();
    await loadFiles();
  }
}

async function loadFiles(dirPath) {
  const target = dirPath || rootPath;
  const data = await api.listFiles(target);

  currentPath = data.currentPath;
  rootPath = data.rootPath;

  renderFiles(data);
}

function renderFiles(data) {
  const list = $('fileList');
  list.innerHTML = '';

  list.classList.remove('hidden');

  const header = $('headerBar');
  if (!data.isRoot) {
    header.classList.remove('hidden');
    $('currentDir').textContent = data.currentPath;
  } else {
    header.classList.add('hidden');
  }

  if (data.dirs.length === 0 && data.files.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);font-size:12px;">Carpeta vacía</div>';
    return;
  }

  for (const dir of data.dirs) {
    const div = createItem(dir.name, 'folder', '📁', '');
    div.addEventListener('click', () => loadFiles(dir.path));
    list.appendChild(div);
  }

  const strip = config.strip !== false;

  for (const file of data.files) {
    const displayName = strip ? file.name.replace(/\.[^.]+$/, '') : file.name;
    const preview = file.content.slice(0, 40);
    const div = createItem(displayName, 'file', '📄', preview);
    div.addEventListener('click', async () => {
      const result = await api.copyFile(file.path);
      if (result.success) {
        showToast('✓ Copiado al portapapeles');
      }
    });
    list.appendChild(div);
  }
}

function createItem(name, type, icon, preview) {
  const div = document.createElement('div');
  div.className = `file-item ${type}`;
  div.innerHTML = `
    <span class="fi-icon">${icon}</span>
    <span class="fi-name">${escapeHtml(name)}</span>
    ${preview ? `<span class="fi-preview">${escapeHtml(preview)}</span>` : ''}
  `;
  return div;
}

function goBack() {
  if (currentPath && currentPath !== rootPath) {
    const parent = currentPath.split(/[\\/]/).slice(0, -1).join('/');
    loadFiles(parent);
  }
}

function showNoFolder() {
  $('noFolder').classList.remove('hidden');
  $('fileList').classList.add('hidden');
  $('headerBar').classList.add('hidden');
}

function hideNoFolder() {
  $('noFolder').classList.add('hidden');
}

function showToast(msg) {
  const toast = $('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
