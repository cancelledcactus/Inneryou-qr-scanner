// === ZXing QR + Barcode Scanner with Google Sheets ===
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyGvlb4yYPsiCzHFc_gH5OfKTTsSotblGSKhfThpCknv3jywSyDwrS_4vHdrEljaXVrMA/exec";

// --- Room & Workshop ---
let roomName = localStorage.getItem("roomName") || "Not Set";
let workshopName = localStorage.getItem("workshopName") || "";
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

// --- UI Helpers ---
const popup = document.getElementById("popup");
const messageBox = document.getElementById("message");

function showMessage(text, color = "#238636") {
  messageBox.style.background = color;
  messageBox.textContent = text;
}

function showPopup(text, color = "#238636") {
  popup.textContent = text;
  popup.style.background = color;
  popup.classList.add("show");
  setTimeout(() => popup.classList.remove("show"), 2000);
}

// --- Duplicate prevention ---
let lastScanned = "";
let lastScanTime = 0;

// --- Parse QR or Barcode ---
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

// --- Send to Google Sheets ---
function sendToSheet(data) {
  fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  showPopup("✅ Scan sent");
}

// --- Handle each scan ---
function handleScan(code) {
  const now = Date.now();

  if (code === lastScanned && now - lastScanTime < 3000) {
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
  data.workshop = workshopName || "Workshop";
  data.timestamp = new Date().toLocaleString();

  showMessage(`✅ Recorded: ${data.name} (${data.id})`);
  showPopup("✅ Scanned!");
  sendToSheet(data);
  navigator.vibrate?.(100);
}

// --- ZXing Camera Setup ---
let codeReader = new ZXing.BrowserMultiFormatReader();
let devices = [];
let currentCameraIndex = 0;

async function initScanner() {
  try {
    devices = await codeReader.listVideoInputDevices();
    if (devices.length === 0) {
      showMessage("❌ No camera found", "#d73a49");
      return;
    }

    startScanner(devices[currentCameraIndex].deviceId);
  } catch (err) {
    console.error(err);
    showMessage("Camera init failed", "#d73a49");
  }
}

function startScanner(deviceId) {
  codeReader.decodeFromVideoDevice(deviceId, "scanner", (result, err) => {
    if (result) handleScan(result.getText().trim());
  });
}

// --- Switch Camera ---
document.getElementById("switchCam").addEventListener("click", async () => {
  if (devices.length < 2) {
    showMessage("Only one camera available", "#d29922");
    return;
  }

  currentCameraIndex = (currentCameraIndex + 1) % devices.length;
  await codeReader.reset();
  showPopup("🔁 Switched camera");
  startScanner(devices[currentCameraIndex].deviceId);
  showMessage(
    `🔁 Camera: ${devices[currentCameraIndex].label || "Cam " + (currentCameraIndex + 1)}`
  );
});

// --- Start scanner ---
initScanner();

