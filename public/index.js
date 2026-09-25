"use strict";

const homeView = document.getElementById("home-view");
const browserView = document.getElementById("browser-view");
const homeForm = document.getElementById("home-form");
const toolbarForm = document.getElementById("toolbar-form");
const homeAddress = document.getElementById("home-address");
const toolbarAddress = document.getElementById("toolbar-address");
const searchEngine = document.getElementById("search-engine");
const homeStatus = document.getElementById("home-status");
const pageStage = document.getElementById("page-stage");
const pageLoading = document.getElementById("page-loading");
const pageError = document.getElementById("page-error");
const pageErrorDetail = document.getElementById("page-error-detail");
const loadingBar = document.getElementById("loading-bar");

const { ScramjetController } = $scramjetLoadController();
const controller = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

let proxyFrame = null;
let controllerReady = false;
let connectionReady = false;
let lastRequestedUrl = "";
let loadingTimeout = null;

controller.init();

function setHomeStatus(message, isError = false) {
	homeStatus.textContent = message;
	homeStatus.dataset.error = String(isError);
}

function setLoading(active) {
	clearTimeout(loadingTimeout);
	loadingBar.classList.remove("active", "complete");
	if (active) {
		pageLoading.hidden = false;
		requestAnimationFrame(() => loadingBar.classList.add("active"));
		loadingTimeout = setTimeout(() => {
			if (loadingBar.classList.contains("active"))
				showPageError("The page took too long to respond.");
		}, 30000);
	} else {
		pageLoading.hidden = true;
		loadingBar.classList.add("complete");
		loadingTimeout = setTimeout(
			() => loadingBar.classList.remove("complete"),
			500
		);
	}
}

function showPageError(message) {
	setLoading(false);
	pageErrorDetail.textContent = message;
	pageError.hidden = false;
}

function hidePageError() {
	pageError.hidden = true;
}

async function ensureProxyReady() {
	if (!controllerReady) {
		await registerSW();
		controllerReady = true;
	}
	if (!connectionReady) {
		const wispUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;
		if ((await connection.getTransport()) !== "/libcurl/index.mjs")
			await connection.setTransport("/libcurl/index.mjs", [
				{ websocket: wispUrl },
			]);
		connectionReady = true;
	}
	if (!proxyFrame) {
		proxyFrame = controller.createFrame();
		proxyFrame.frame.id = "sj-frame";
		proxyFrame.frame.title = "Proxied webpage";
		proxyFrame.frame.addEventListener("load", () => setLoading(false));
		proxyFrame.addEventListener("navigate", () => setLoading(true));
		proxyFrame.addEventListener("urlchange", (event) => {
			if (event.url) toolbarAddress.value = event.url.toString();
		});
		pageStage.appendChild(proxyFrame.frame);
	}
}

async function openAddress(value) {
	const input = value.trim();
	if (!input) return;
	const url = search(input, searchEngine.value);
	lastRequestedUrl = url;
	homeAddress.value = input;
	toolbarAddress.value = url;
	setHomeStatus("Preparing secure browser…");
	hidePageError();
	try {
		await ensureProxyReady();
		homeView.hidden = true;
		browserView.hidden = false;
		setLoading(true);
		proxyFrame.go(url);
		setHomeStatus("");
	} catch (err) {
		console.error(err);
		if (browserView.hidden)
			setHomeStatus(
				"The browser could not start. Refresh the page and try again.",
				true
			);
		else
			showPageError(
				err?.message || "The proxy connection could not be established."
			);
	}
}

homeForm.addEventListener("submit", (event) => {
	event.preventDefault();
	openAddress(homeAddress.value);
});
toolbarForm.addEventListener("submit", (event) => {
	event.preventDefault();
	openAddress(toolbarAddress.value);
	toolbarAddress.blur();
});
document
	.querySelectorAll("[data-url]")
	.forEach((shortcut) =>
		shortcut.addEventListener("click", () => openAddress(shortcut.dataset.url))
	);
document.getElementById("back-button").addEventListener("click", () => {
	hidePageError();
	setLoading(true);
	proxyFrame?.back();
});
document.getElementById("forward-button").addEventListener("click", () => {
	hidePageError();
	setLoading(true);
	proxyFrame?.forward();
});
document.getElementById("reload-button").addEventListener("click", () => {
	hidePageError();
	setLoading(true);
	proxyFrame?.reload();
});
document.getElementById("home-button").addEventListener("click", () => {
	browserView.hidden = true;
	homeView.hidden = false;
	setLoading(false);
	homeAddress.focus();
});
document.getElementById("try-again-button").addEventListener("click", () => {
	if (lastRequestedUrl) openAddress(lastRequestedUrl);
});
document.addEventListener("keydown", (event) => {
	if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
		event.preventDefault();
		const input = browserView.hidden ? homeAddress : toolbarAddress;
		input.focus();
		input.select();
	}
});
