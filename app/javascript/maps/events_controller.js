import { clearMarkers, groupByVenue, formatDate, formatEventTime } from "maps/helpers";
import { bindPlannerButtons, syncPlannerButtons } from "maps/planner_state";

export default class EventsController {
	constructor(mapController) {
		this.mapController = mapController;
		this.markers = [];
		this.infoWindow = new google.maps.InfoWindow();
	}

	async load() {
		clearMarkers(this.markers);
		this.markers = [];

		const container = document.getElementById("eventList");
		container.innerHTML = "<p>Loading events...</p>";

		const start = document.getElementById("startDate").value;
		const end = document.getElementById("endDate").value;
		const startTime = document.getElementById("startTime").value;
		const endTime = document.getElementById("endTime").value;
		const classification = document.getElementById("classification").value;

		let url = "/events";
		const params = [];

		const startISO = formatDate(start);
		const endISO = formatDate(end, true);

		if (startISO) params.push(`start=${encodeURIComponent(startISO)}`);
		if (endISO) params.push(`end=${encodeURIComponent(endISO)}`);
		if (classification) params.push(`classification=${encodeURIComponent(classification)}`);

		if (params.length > 0) {
			url += `?${params.join("&")}`;
		}

		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`Request failed: ${response.status}`);

			const events = this.filterEvents(await response.json(), { startTime, endTime });
			const grouped = groupByVenue(events);

			this.renderList(grouped);
			this.renderMarkers(grouped);
			this.bindPlannerButtons();
		} catch (error) {
			container.innerHTML = "<p>Unable to load events.</p>";
			console.error(error);
		}
	}

	renderList(groups) {
		const container = document.getElementById("eventList");

		if (groups.length === 0) {
			container.innerHTML = "<p>No events found</p>";
			return;
		}

		container.innerHTML = groups.map(group => {
			const items = group.events
				.sort((a, b) => new Date(a.date) - new Date(b.date))
				.map(event => {
					const ticketmasterUrl = this.sanitizeUrl(event.ticketmaster_url);
					const venueAddress = group.address || event.venue_address;

					const payload = encodeURIComponent(JSON.stringify({
						title: event.name,
						item_type: "event",
						location_name: group.venue,
						address: venueAddress,
						latitude: event.lat,
						longitude: event.lng,
						start_time: event.starts_at,
						external_id: `${event.name}-${event.starts_at}-${group.venue}`,
						source: "ticketmaster",
						category: event.classification,
						ticketmaster_url: event.ticketmaster_url
					}));

					return `
						<li class="maps-result-item">
							<div class="maps-result-copy">
								<strong>${event.name}</strong>
								<div class="maps-result-meta">
									<span>${new Date(event.date).toLocaleDateString()}</span>
									<span>${formatEventTime(event.time)}</span>
								</div>
								${ticketmasterUrl ? `<div class="maps-result-links"><a href="${ticketmasterUrl}" target="_blank" rel="noopener">Ticketmaster</a></div>` : ""}
							</div>
							<button
								type="button"
								class="add-to-planner-button planner-inline-action"
								data-item="${payload}"
								aria-label="Save ${event.name} to planner">
								Save
							</button>
						</li>
					`;
				})
				.join("");

			return `
				<div class="maps-group-card">
					<strong class="maps-group-title">${group.venue}</strong>
					${group.address ? `<div class="maps-result-meta"><span>${this.escapeHtml(group.address)}</span></div>` : ""}
					<ul>${items}</ul>
				</div>
			`;
		}).join("");

		syncPlannerButtons(container);
	}

	renderMarkers(groups) {
		groups.forEach(group => {
			const marker = new google.maps.Marker({
				position: {
					lat: parseFloat(group.lat),
					lng: parseFloat(group.lng)
				},
				map: this.mapController.map,
				title: group.venue,
				label: String(group.events.length)
			});

			marker.addListener("click", () => {
				const items = group.events
					.sort((a, b) => new Date(a.date) - new Date(b.date))
					.map(event => `
						<li>
							<strong>${event.name}</strong><br>
							${new Date(event.date).toLocaleDateString()} at ${formatEventTime(event.time)}
							${this.renderTicketmasterInfoWindowLink(event)}
						</li>
					`)
					.join("");

				this.infoWindow.setContent(`
					<div style="max-width:250px">
						<h3>${group.venue}</h3>
						${group.address ? `${this.escapeHtml(group.address)}<br>` : ""}
						<ul>${items}</ul>
					</div>
				`);

				this.infoWindow.open(this.mapController.map, marker);
			});

			this.markers.push(marker);
		});
	}

	bindPlannerButtons() {
		const container = document.getElementById("eventList");
		bindPlannerButtons(container);
	}

	filterEvents(events, filters) {
		if (!filters.startTime && !filters.endTime) return events;

		const startMinute = this.timeToMinutes(filters.startTime || "00:00");
		const endMinute = this.timeToMinutes(filters.endTime || "23:59");
		if (startMinute === null || endMinute === null) return events;

		const ranges = this.normalizeRange(startMinute, endMinute);

		return events.filter(event => {
			const eventMinute = this.timeToMinutes((event.time || "").slice(0, 5));
			if (eventMinute === null) return false;

			return ranges.some(range => (
				eventMinute >= range.start && eventMinute <= range.end
			));
		});
	}

	normalizeRange(startMinute, endMinute) {
		if (endMinute >= startMinute) {
			return [{ start: startMinute, end: endMinute }];
		}

		return [
			{ start: startMinute, end: 24 * 60 },
			{ start: 0, end: endMinute }
		];
	}

	timeToMinutes(time) {
		const match = time.match(/^(\d{2}):(\d{2})$/);
		if (!match) return null;

		const hours = Number(match[1]);
		const minutes = Number(match[2]);
		if (hours > 23 || minutes > 59) return null;

		return (hours * 60) + minutes;
	}

	renderTicketmasterInfoWindowLink(event) {
		const ticketmasterUrl = this.sanitizeUrl(event.ticketmaster_url);
		if (!ticketmasterUrl) return "";

		return `<br><a href="${ticketmasterUrl}" target="_blank" rel="noopener">Ticketmaster</a>`;
	}

	sanitizeUrl(url) {
		if (!url) return "";

		try {
			const parsed = new URL(url);
			if (!["http:", "https:"].includes(parsed.protocol)) return "";
			return this.escapeHtml(parsed.href);
		} catch (_error) {
			return "";
		}
	}

	escapeHtml(value) {
		return String(value).replace(/[&<>"']/g, character => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			"\"": "&quot;",
			"'": "&#39;"
		})[character]);
	}
}
