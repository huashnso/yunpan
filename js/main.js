// ===================== 全局配置 =====================
const PASSWORD = "2006";        // 登录密码
const MAX_STORAGE = 20 * 1024 * 1024 * 1024; // 总容量 20GB

// 从本地存储读取文件、分组数据，无数据则初始化空数组
let files = JSON.parse(localStorage.getItem("files")) || [];
let groups = JSON.parse(localStorage.getItem("groups")) || [
  { id: "default", name: "默认分组" }
];

let currentGroup = "all";       // 当前选中分组：all=查看全部

// ===================== 获取DOM元素 =====================
const loginWrapper = document.getElementById("loginWrapper");
const mainContainer = document.getElementById("mainContainer");
const fileList = document.getElementById("fileList");
const groupList = document.getElementById("groupList");
const progressBar = document.getElementById("progressBar");
const storageText = document.getElementById("storageText");
const fileInput = document.getElementById("fileInput");
const searchInput = document.getElementById("search");
const dropArea = document.getElementById("dropArea");
const previewModal = document.getElementById("previewModal");
const previewImg = document.getElementById("previewImg");

// ===================== 登录功能 =====================
function login() {
  // 获取输入的密码
  const p = document.getElementById("pwd").value;
  // 密码校验
  if (p === PASSWORD) {
    loginWrapper.style.display = "none";    // 隐藏登录页
    mainContainer.style.display = "flex";    // 显示主界面
    init();                                  // 初始化所有功能
  } else {
    alert("密码错误");
  }
}

// ===================== 页面初始化 =====================
function init() {
  fileInput.addEventListener("change", uploadFiles);  // 普通文件上传监听
  searchInput.addEventListener("input", renderFiles); // 搜索框监听
  bindDragEvent();                                     // 绑定拖拽上传事件

  renderGroups();    // 渲染分组列表
  renderFiles();     // 渲染文件列表
  updateStorage();   // 更新存储空间信息
}

// ===================== 拖拽上传事件绑定 =====================
function bindDragEvent() {
  // 阻止浏览器默认拖拽行为
  ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    dropArea.addEventListener(eventName, e => e.preventDefault());
  });

  // 拖拽进入/悬浮：激活样式
  ["dragenter", "dragover"].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add("active"));
  });

  // 拖拽离开/放置：取消激活样式
  ["dragleave", "drop"].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove("active"));
  });

  // 拖拽放置文件：开始上传
  dropArea.addEventListener("drop", e => {
    const dropFiles = Array.from(e.dataTransfer.files);
    handleFileList(dropFiles);
  });
}

// ===================== 统一文件处理入口（普通上传 / 拖拽上传共用） =====================
function handleFileList(fileArr) {
  fileArr.forEach(file => {
    const reader = new FileReader();
    // 文件读取完成回调
    reader.onload = ev => {
      // 组装文件对象
      files.push({
        id: Date.now() + Math.random(), // 唯一ID
        name: file.name,                // 文件名
        size: file.size,                // 文件大小(字节)
        url: ev.target.result,          // base64文件地址
        group: currentGroup === "all" ? "default" : currentGroup, // 所属分组
        type: file.type                 // 文件类型
      });
      saveAll();        // 保存到本地
      renderFiles();    // 刷新文件列表
      updateStorage();  // 刷新容量
    };
    // 以base64方式读取文件
    reader.readAsDataURL(file);
  });
}

// ===================== 普通点击上传 =====================
function uploadFiles(e) {
  const fs = Array.from(e.target.files);
  handleFileList(fs);
  e.target.value = ""; // 清空选择框，允许重复选同一文件
}

// ===================== 分组管理 =====================
// 新建分组
function createGroup() {
  const name = prompt("分组名称");
  if (!name) return; // 为空则取消
  groups.push({ id: "g" + Date.now(), name });
  saveGroups();
  renderGroups();
}

// 渲染分组列表
function renderGroups() {
  // 先添加「所有文件」选项
  groupList.innerHTML = `
    <li class="${currentGroup === 'all' ? 'active' : ''}" onclick="switchGroup('all')">
      所有文件
    </li>
  `;
  // 遍历自定义分组
  groups.forEach(g => {
    const li = document.createElement("li");
    li.className = currentGroup === g.id ? "active" : "";
    li.innerHTML = `
      <span onclick="switchGroup('${g.id}')">${g.name}</span>
      <div class="group-actions">
        <span onclick="renameGroup('${g.id}')">编辑</span>
        <span onclick="deleteGroup('${g.id}')">×</span>
      </div>
    `;
    groupList.appendChild(li);
  });
}

// 切换当前分组
function switchGroup(id) {
  currentGroup = id;
  renderGroups();
  renderFiles();
}

// 重命名分组
function renameGroup(id) {
  const g = groups.find(x => x.id === id);
  const newName = prompt("新名称", g.name);
  if (newName) {
    g.name = newName;
    saveGroups();
    renderGroups();
  }
}

// 删除分组
function deleteGroup(id) {
  if (!confirm("删除分组将删除组内所有文件！")) return;
  groups = groups.filter(x => x.id !== id);
  files = files.filter(x => x.group !== id);
  saveAll();
  switchGroup("all"); // 切回全部文件
}

// ===================== 文件列表渲染 =====================
function renderFiles() {
  fileList.innerHTML = "";
  let list = files;

  // 按分组筛选
  if (currentGroup !== "all") {
    list = files.filter(f => f.group === currentGroup);
  }
  // 按搜索关键词筛选
  const kw = searchInput.value.toLowerCase();
  if (kw) list = list.filter(f => f.name.toLowerCase().includes(kw));

  // 遍历渲染每个文件卡片
  list.forEach(f => {
    const div = document.createElement("div");
    div.className = "file-item";
    // 判断是否为图片，切换图标
    const isImg = f.type.startsWith("image/");
    const iconHtml = isImg
      ? `<i class="fas fa-image" onclick="openPreview('${f.url}')"></i>`
      : `<i class="fas fa-file"></i>`;

    div.innerHTML = `
      <div class="file-icon">${iconHtml}</div>
      <div class="file-name">${f.name}</div>
      <div class="file-size">${formatSize(f.size)}</div>
      <div class="file-actions">
        <button onclick="download(${f.id})">下载</button>
        <button onclick="remove(${f.id})">删除</button>
        <button onclick="move(${f.id})">移动</button>
      </div>
    `;
    fileList.appendChild(div);
  });
}

// ===================== 图片预览 =====================
// 打开预览弹窗
function openPreview(imgUrl) {
  previewImg.src = imgUrl;
  previewModal.style.display = "flex";
}
// 关闭预览弹窗
function closePreview() {
  previewModal.style.display = "none";
}

// ===================== 文件操作 =====================
// 下载文件
function download(id) {
  const f = files.find(x => x.id === id);
  const a = document.createElement("a");
  a.href = f.url;
  a.download = f.name;
  a.click();
}

// 删除文件
function remove(id) {
  if (!confirm("确定删除？")) return;
  files = files.filter(x => x.id !== id);
  saveAll();
  renderFiles();
  updateStorage();
}

// 移动文件：弹出分组选择
function move(id) {
  const f = files.find(x => x.id === id);
  let selectHtml = `<select onchange="changeGroup(${id},this.value)">`;
  groups.forEach(g => {
    selectHtml += `<option value="${g.id}">${g.name}</option>`;
  });
  selectHtml += `</select>`;
  const temp = document.createElement("div");
  temp.innerHTML = selectHtml;
  const sel = temp.firstChild;
  sel.click();
}

// 执行文件分组移动
function changeGroup(fileId, groupId) {
  const f = files.find(x => x.id === fileId);
  f.group = groupId;
  saveAll();
  renderFiles();
}

// ===================== 本地存储持久化 =====================
// 保存文件+分组
function saveAll() {
  localStorage.setItem("files", JSON.stringify(files));
  localStorage.setItem("groups", JSON.stringify(groups));
}
// 只保存分组
function saveGroups() {
  localStorage.setItem("groups", JSON.stringify(groups));
}

// ===================== 存储空间计算与更新 =====================
function updateStorage() {
  // 计算已使用总字节数
  const total = files.reduce((s, f) => s + f.size, 0);
  // 计算使用百分比
  const per = Math.min((total / MAX_STORAGE) * 100, 100);
  progressBar.style.width = per + "%";
  storageText.innerText = `${formatSize(total)} / 20GB`;
}

// 字节格式化：B / KB / MB / GB
function formatSize(b) {
  if (b < 1024) return b + "B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + "KB";
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + "MB";
  return (b / 1024 / 1024 / 1024).toFixed(2) + "GB";
}
