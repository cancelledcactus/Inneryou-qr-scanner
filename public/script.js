const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyGvlb4yYPsiCzHFc_gH5OfKTTsSotblGSKhfThpCknv3jywSyDwrS_4vHdrEljaXVrMA/exec";

let roomName = localStorage.getItem("roomName") || "Not Set";
document.getElementById("roomDisplay").textContent = `Room: ${roomName}`;
document.getElementById("setRoom").addEventListener("click", () => {
  const val = document.getElementById("roomInput").value.trim();
  if (val) {
    roomName = val;
    localStorage.setItem("roomName", val);
    document.getElementById("roomDisplay").textContent = `Room: ${val}`;
    showMessage(`Room set to: ${val}`, "#238636");
  }
});

let lastScanned = "";
let lastScanTime = 0;
let currentCamera = { facingMode: "environment" }; // Default rear camera
let html5QrCode = new Html5Qrcode("scanner");
let camerasList = [];
let currentCameraIndex = 0;

function showMessage(text, color = "#238636") {
  const msg = document.getElementById("message");
  msg.style.background = color;
  msg.textContent = text;
}

function showPopup(text, color = "#238636") {
  const popup = document.getElementById("popup");
  popup.textContent = text;
  popup.style.background = color;
  popup.classList.add("show");
  setTimeout(() => popup.classList.remove("show"), 2000);
}

function sendToSheet(data) {
  fetch(WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function isValidQRFormat(code) {
  return code.includes(",") && code.split(",").length === 2;
}

function isStudentID(code) {
  return /^[0-9]{5,15}$/.test(code);
}

function parseData(code) {
  if (isValidQRFormat(code)) {
    const [name, id] = code.split(",");
    return { name: name.trim(), id: id.trim() };
  } else if (isStudentID(code)) {
    return { name: "ID Scan", id: code.trim() };
  } else {
    return null;
  }
}

function handleScan(code) {
  const now = Date.now();

  if (code === lastScanned && now - lastScanTime < 4000) {
    showMessage("⚠️ Duplicate scan ignored", "#d29922");
    return;
  }

  const data = parseData(code);
  if (!data) {
    showMessage("❌ Invalid QR or barcode format!", "#d73a49");
    showPopup("Invalid code", "#d73a49");
    return;
  }

  lastScanned = code;
  lastScanTime = now;

  data.room = roomName;
  data.timestamp = new Date().toLocaleString();

  showMessage(`✅ Recorded: ${data.name} (${data.id})`);
  showPopup("✅ Scanned!");
  sendToSheet(data);
  navigator.vibrate?.(100);
}

async function startScanner(cameraConfig) {
  try {
    await html5QrCode.start(
      cameraConfig,
      { fps: 10, qrbox: { width: 250, height: 250 } },
      handleScan,
      () => {}
    );
  } catch (err) {
    showMessage("Camera start failed.", "#d73a49");
  }
}

Html5Qrcode.getCameras()
  .then(devices => {
    if (devices && devices.length) {
      camerasList = devices;
      currentCamera = { deviceId: { exact: devices[0].id } };
      startScanner(currentCamera);
    } else {
      showMessage("No cameras found.", "#d73a49");
    }
  })
  .catch(() => showMessage("Camera access failed.", "#d73a49"));

document.getElementById("switchCam").addEventListener("click", async () => {
  if (camerasList.length < 2) {
    showMessage("Only one camera available.", "#d29922");
    return;
  }

  currentCameraIndex = (currentCameraIndex + 1) % camerasList.length;
  const newCam = camerasList[currentCameraIndex];

  await html5QrCode.stop();
  html5QrCode.clear();
  showMessage(`🔁 Switched to camera: ${newCam.label || "Camera " + (currentCameraIndex + 1)}`);
  showPopup("🔁 Switched camera");
  startScanner({ deviceId: { exact: newCam.id } });
});
