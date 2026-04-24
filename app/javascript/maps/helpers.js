export function clearMarkers(markers) {
	markers.forEach(marker => marker.setMap(null));
}

export function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, character => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;"
	})[character]);
}

export function sanitizeUrl(url) {
	if (!url) return "";

	try {
		const parsed = new URL(url);
		if (!["http:", "https:"].includes(parsed.protocol)) return "";
		return escapeHtml(parsed.href);
	} catch (_error) {
		return "";
	}
}

export function fillDirectionsDestination(address) {
	const destination = document.getElementById("destination");
	if (!destination || !address) return;

	destination.value = address;
	destination.dispatchEvent(new Event("input", { bubbles: true }));
	destination.dispatchEvent(new Event("change", { bubbles: true }));

	destination.closest(".maps-toolbar")?.scrollIntoView({
		behavior: "smooth",
		block: "center"
	});

	window.setTimeout(() => destination.focus(), 250);
}

export function fillDirectionsOrigin(address) {
	const origin = document.getElementById("origin");
	if (!origin || !address) return;

	origin.value = address;
	origin.dispatchEvent(new Event("input", { bubbles: true }));
	origin.dispatchEvent(new Event("change", { bubbles: true }));

	origin.closest(".maps-toolbar")?.scrollIntoView({
		behavior: "smooth",
		block: "center"
	});

	window.setTimeout(() => origin.focus(), 250);
}

export function bindDirectionAddressButtons(root = document) {
	root.querySelectorAll(".maps-address-button").forEach(button => {
		if (button.dataset.addressBound === "true") return;
		button.dataset.addressBound = "true";

		button.addEventListener("click", () => {
			fillDirectionsDestination(button.dataset.address);
		});
	});
}

export function renderStateCard(title, message) {
	return `
		<div class="maps-state-card">
			<strong>${escapeHtml(title)}</strong>
			<p>${escapeHtml(message)}</p>
		</div>
	`;
}

export function groupByVenue(events) {
	const grouped = {};

	events.forEach(event => {
		if (!event.lat || !event.lng) return;

		const key = `${parseFloat(event.lat).toFixed(4)},${parseFloat(event.lng).toFixed(4)}`;

		if (!grouped[key]) {
			grouped[key] = {
				lat: event.lat,
				lng: event.lng,
				venue: event.venue,
				address: event.venue_address,
				events: []
			};
		}

		grouped[key].events.push(event);
	});

	return Object.values(grouped);
}

export function formatDate(date, endOfDay = false) {
	if (!date) return null;

	const parsed = new Date(date);
	if (isNaN(parsed)) return null;

	parsed.setUTCHours(
		endOfDay ? 23 : 0,
		endOfDay ? 59 : 0,
		endOfDay ? 59 : 0
	);

	return `${parsed.toISOString().split(".")[0]}Z`;
}

export function formatEventTime(time) {
	if (!time) return "Time TBA";

	const parsed = new Date(`2000-01-01T${time}`);
	if (Number.isNaN(parsed.getTime())) return time;

	return parsed.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit"
	});
}

export function timeToMinutes(time) {
	const match = time.match(/^(\d{2}):(\d{2})$/);
	if (!match) return null;

	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours > 23 || minutes > 59) return null;

	return (hours * 60) + minutes;
}

export function normalizeRange(startMinute, endMinute) {
	if (endMinute >= startMinute) {
		return [{ start: startMinute, end: endMinute }];
	}

	return [
		{ start: startMinute, end: 24 * 60 },
		{ start: 0, end: endMinute }
	];
}
