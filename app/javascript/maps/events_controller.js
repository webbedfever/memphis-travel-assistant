import {
	bindDirectionAddressButtons,
	clearMarkers,
	escapeHtml,
	formatDate,
	formatEventTime,
	groupByVenue,
	normalizeRange,
	renderStateCard,
	sanitizeUrl,
	timeToMinutes
} from "maps/helpers";
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
		this.updateCountLabel("Loading...");
		container.innerHTML = renderStateCard(
			"Loading events",
			"Checking what is happening around Memphis right now."
		);

		const start = document.getElementById("startDate").value;
		const end = document.getElementById("endDate").value;
		const startTime = document.getElementById("startTime").value;
		const endTime = document.getElementById("endTime").value;
		const classification = document.getElementById("classification").value;

		const startISO = formatDate(start);
		const endISO = formatDate(end, true);
		const params = new URLSearchParams();

		if (startISO) params.set("start", startISO);
		if (endISO) params.set("end", endISO);
		if (classification) params.set("classification", classification);

		const query = params.toString();
		const url = query ? `/events?${query}` : "/events";

		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`Request failed: ${response.status}`);

			const events = this.filterEvents(await response.json(), { startTime, endTime });
			const grouped = groupByVenue(events);

			this.updateCountLabel(this.countLabel(events.length, "event"));
			this.renderList(grouped);
			this.renderMarkers(grouped);
			this.bindPlannerButtons();
		} catch (error) {
			this.updateCountLabel("Unavailable");
			container.innerHTML = renderStateCard(
				"Unable to load events",
				"We could not reach the events feed just now. Try again in a moment."
			);
			console.error(error);
		}
	}

	renderList(groups) {
		const container = document.getElementById("eventList");

		if (groups.length === 0) {
			this.updateCountLabel(this.countLabel(0, "event"));
			container.innerHTML = renderStateCard(
				"No events found",
				"Try widening the date range, adjusting the time window, or moving the map."
			);
			return;
		}

		container.innerHTML = groups.map(group => {
			const items = group.events
				.sort((a, b) => new Date(a.date) - new Date(b.date))
				.map(event => {
					const ticketmasterUrl = sanitizeUrl(event.ticketmaster_url);
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
					${group.address ? `<div class="maps-result-meta">${this.renderAddressButton(group.address)}</div>` : ""}
					<ul>${items}</ul>
				</div>
			`;
		}).join("");

		syncPlannerButtons(container);
		bindDirectionAddressButtons(container);
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
						<li class="maps-marker-list-item">
							<strong>${escapeHtml(event.name)}</strong>
							<span>${new Date(event.date).toLocaleDateString()} at ${formatEventTime(event.time)}</span>
							${this.renderTicketmasterInfoWindowLink(event)}
						</li>
					`)
					.join("");

				const encodedAddress = encodeURIComponent(group.address || group.venue || "");

				this.infoWindow.setContent(`
					<div class="maps-marker-window">
						<div class="maps-marker-heading">
							<strong>${escapeHtml(group.venue)}</strong>
							<span>${this.countLabel(group.events.length, "event")}</span>
						</div>
						${group.address ? `<p class="maps-marker-address">${escapeHtml(group.address)}</p>` : ""}
						<div class="maps-marker-actions">
							<button type="button" class="maps-marker-action" onclick="window.useMarkerDestination(decodeURIComponent('${encodedAddress}'))">Route Here</button>
						</div>
						<ul class="maps-marker-list">${items}</ul>
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

		const startMinute = timeToMinutes(filters.startTime || "00:00");
		const endMinute = timeToMinutes(filters.endTime || "23:59");
		if (startMinute === null || endMinute === null) return events;

		const ranges = normalizeRange(startMinute, endMinute);

		return events.filter(event => {
			const eventMinute = timeToMinutes((event.time || "").slice(0, 5));
			if (eventMinute === null) return false;

			return ranges.some(range => (
				eventMinute >= range.start && eventMinute <= range.end
			));
		});
	}

	renderTicketmasterInfoWindowLink(event) {
		const ticketmasterUrl = sanitizeUrl(event.ticketmaster_url);
		if (!ticketmasterUrl) return "";

		return `<a href="${ticketmasterUrl}" target="_blank" rel="noopener">Ticketmaster</a>`;
	}

	renderAddressButton(address) {
		const safeAddress = escapeHtml(address);

		return `
			<button
				type="button"
				class="maps-address-button"
				data-address="${safeAddress}"
				title="Use as directions destination">
				${safeAddress}
			</button>
		`;
	}

	updateCountLabel(label) {
		const count = document.getElementById("eventCount");
		if (count) count.textContent = label;
	}

	countLabel(total, noun) {
		return `${total} ${noun}${total === 1 ? "" : "s"} available`;
	}
}
