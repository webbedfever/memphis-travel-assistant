import {
	bindDirectionAddressButtons,
	clearMarkers,
	escapeHtml,
	normalizeRange,
	plannerDateTime,
	renderStateCard,
	sanitizeUrl,
	timeToMinutes
} from "maps/helpers";
import { bindPlannerButtons, syncPlannerButtons } from "maps/planner_state";

export default class PlacesController {
	constructor(mapController) {
		this.mapController = mapController;
		this.markers = [];
		this.infoWindow = new google.maps.InfoWindow();
	}

	async load() {
		clearMarkers(this.markers);
		this.markers = [];

		const container = document.getElementById("placeList");
		this.updateCountLabel("Loading...");
		container.innerHTML = renderStateCard(
			"Loading places",
			"Finding restaurants, attractions, and local spots near the map center."
		);

		const bounds = this.mapController.getBounds();
		const center = this.mapController.getCenter();
		const ne = bounds.getNorthEast();

		const lat = center.lat();
		const lng = center.lng();
		const radius = google.maps.geometry.spherical.computeDistanceBetween(center, ne);
		const type = document.getElementById("placeType").value;
		const date = document.getElementById("startDate").value;
		const startTime = document.getElementById("startTime").value;
		const endTime = document.getElementById("endTime").value;
		const openNowOnly = document.getElementById("openNowButton").getAttribute("aria-pressed") === "true";

		const params = new URLSearchParams({ lat, lng, radius });

		if (type) params.set("type", type);
		if (date) params.set("date", date);
		if (openNowOnly) params.set("open_now", "true");
		const query = params.toString();

		try {
			const response = await fetch(`/places?${query}`);
			if (!response.ok) throw new Error(`Request failed: ${response.status}`);

			const places = this.filterPlaces(await response.json(), {
				date,
				startTime,
				endTime,
				openNowOnly
			});

			this.updateCountLabel(this.countLabel(places.length, "place"));
			this.renderList(places, type, { date, startTime, endTime });
			this.renderMarkers(places);
			this.bindPlannerButtons();
		} catch (error) {
			this.updateCountLabel("Unavailable");
			container.innerHTML = renderStateCard(
				"Unable to load places",
				"We could not reach nearby places right now. Try again in a moment."
			);
			console.error(error);
		}
	}

	renderList(places, type, filters = {}) {
		const container = document.getElementById("placeList");

		if (places.length === 0) {
			this.updateCountLabel(this.countLabel(0, "place"));
			container.innerHTML = renderStateCard(
				"No places found",
				"Try changing the place type, time filters, or moving the map to a different area."
			);
			return;
		}

		container.innerHTML = places.map(place => {
			const name = escapeHtml(place.name || "Unnamed place");
			const address = escapeHtml(place.address || "Address unavailable");
			const addressAction = place.address ? this.renderAddressButton(place.address) : `<span>${address}</span>`;
			const rating = escapeHtml(place.rating || "N/A");
			const hours = escapeHtml(this.formatHours(place));
			const status = escapeHtml(this.formatOpenStatus(place));
			const phone = escapeHtml(place.phone || "");
			const website = sanitizeUrl(place.website);
			const googleUrl = sanitizeUrl(place.google_url);
			const selectedDate = filters.date || "";
			const startTime = filters.startTime || "";
			const endTime = filters.endTime || "";
			const scheduledStart = selectedDate ? plannerDateTime(selectedDate, startTime) : null;
			const scheduledEnd = selectedDate && startTime && endTime
				? plannerDateTime(selectedDate, endTime)
				: null;
			const datedExternalId = selectedDate
				? `${place.place_id || `google-place-${place.name}-${place.lat}-${place.lng}`}-${selectedDate}`
				: place.place_id || `google-place-${place.name}-${place.lat}-${place.lng}`;

			const payload = encodeURIComponent(JSON.stringify({
				title: place.name,
				item_type: "place",
				location_name: place.name,
				address: place.address,
				latitude: place.lat,
				longitude: place.lng,
				start_time: scheduledStart,
				end_time: scheduledEnd,
				external_id: datedExternalId,
				source: "google_places",
				category: type || place.category,
				rating: place.rating,
				open_now: place.open_now,
				hours_day: place.hours_day,
				hours_for_day: place.hours_for_day,
				phone: place.phone,
				website: place.website,
				google_url: place.google_url
			}));

			return `
				<div class="maps-group-card maps-place-card">
					<div class="maps-result-item">
						<div class="maps-result-copy">
							<strong>${name}</strong>
							<div class="maps-result-meta">
								${addressAction}
								<span>Rating: ${rating}</span>
								<span>${status}</span>
								<span>${hours}</span>
								${phone ? `<span>${phone}</span>` : ""}
							</div>
							${this.renderPlaceLinks(website, googleUrl)}
						</div>
						<button
							type="button"
							class="add-to-planner-button planner-inline-action"
							data-item="${payload}"
							aria-label="Save ${name} to planner">
							Save
						</button>
					</div>
				</div>
			`;
		}).join("");

		syncPlannerButtons(container);
		bindDirectionAddressButtons(container);
	}

	renderMarkers(places) {
		places.forEach(place => {
			if (!place.lat || !place.lng) return;

			const marker = new google.maps.Marker({
				position: {
					lat: parseFloat(place.lat),
					lng: parseFloat(place.lng)
				},
				map: this.mapController.map,
				title: place.name,
				icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
			});

			marker.addListener("click", () => {
				const address = place.address || "";
				const encodedAddress = encodeURIComponent(address);
				const category = escapeHtml(this.formatCategory(place.category));
				const rating = escapeHtml(place.rating || "N/A");
				const status = escapeHtml(this.formatOpenStatus(place));
				const hours = escapeHtml(this.formatHours(place));
				const links = this.renderMarkerLinks(
					sanitizeUrl(place.website),
					sanitizeUrl(place.google_url)
				);

				this.infoWindow.setContent(`
					<div class="maps-marker-window">
						<div class="maps-marker-heading">
							<strong>${escapeHtml(place.name || "Unnamed place")}</strong>
							<span>${status}</span>
						</div>
						${address ? `<p class="maps-marker-address">${escapeHtml(address)}</p>` : ""}
						<div class="maps-marker-meta">
							<span>${category}</span>
							<span>Rating: ${rating}</span>
							<span>${hours}</span>
						</div>
						${address ? `
							<div class="maps-marker-actions">
								<button type="button" class="maps-marker-action" onclick="window.useMarkerDestination(decodeURIComponent('${encodedAddress}'))">Route Here</button>
								<button type="button" class="maps-marker-action" onclick="window.useMarkerOrigin(decodeURIComponent('${encodedAddress}'))">Start Here</button>
							</div>
						` : ""}
						${links ? `<div class="maps-marker-links">${links}</div>` : ""}
					</div>
				`);

				this.infoWindow.open(this.mapController.map, marker);
			});

			this.markers.push(marker);
		});
	}

	bindPlannerButtons() {
		const container = document.getElementById("placeList");
		bindPlannerButtons(container);
	}

	filterPlaces(places, filters) {
		return places.filter(place => {
			if (filters.openNowOnly && place.open_now !== true) return false;
			if (!filters.startTime && !filters.endTime) return true;

			return this.placeMatchesTimeWindow(place, filters);
		});
	}

	placeMatchesTimeWindow(place, filters) {
		if (!Array.isArray(place.hours_periods) || place.hours_periods.length === 0) {
			return false;
		}

		const date = filters.date ? new Date(`${filters.date}T00:00:00`) : new Date();
		if (Number.isNaN(date.getTime())) return false;

		const day = date.getDay();
		const startMinute = timeToMinutes(filters.startTime || "00:00");
		const endMinute = timeToMinutes(filters.endTime || "23:59");
		if (startMinute === null || endMinute === null) return false;

		const requestedRanges = normalizeRange(startMinute, endMinute);
		const openRanges = place.hours_periods.flatMap(period => this.periodRangesForDay(period, day));

		return requestedRanges.every(requestedRange => (
			openRanges.some(openRange => (
				openRange.start <= requestedRange.start && openRange.end >= requestedRange.end
			))
		));
	}

	periodRangesForDay(period, day) {
		const openDay = Number(period.open?.day);
		const closeDay = Number(period.close?.day);
		const openMinute = this.timeTextToMinutes(period.open?.time);
		const closeMinute = this.timeTextToMinutes(period.close?.time);

		if (Number.isNaN(openDay) || openMinute === null) return [];
		if (!period.close) return day === openDay ? [{ start: 0, end: 24 * 60 }] : [];
		if (Number.isNaN(closeDay) || closeMinute === null) return [];

		if (openDay === day && closeDay === day && closeMinute > openMinute) {
			return [{ start: openMinute, end: closeMinute }];
		}

		const ranges = [];
		if (openDay === day) ranges.push({ start: openMinute, end: 24 * 60 });
		if (closeDay === day) ranges.push({ start: 0, end: closeMinute });

		return ranges;
	}

	timeTextToMinutes(time) {
		if (!time || !/^\d{4}$/.test(time)) return null;

		const hours = Number(time.slice(0, 2));
		const minutes = Number(time.slice(2));
		if (hours > 23 || minutes > 59) return null;

		return (hours * 60) + minutes;
	}

	formatOpenStatus(place) {
		if (place.open_now === true) return "Open now";
		if (place.open_now === false) return "Closed now";
		return "Open status unavailable";
	}

	formatHours(place) {
		if (place.hours_for_day) return place.hours_for_day;
		if (place.hours_day) return `${place.hours_day}: hours unavailable`;
		return "Hours unavailable";
	}

	formatCategory(category) {
		if (!category) return "Place";

		return String(category)
			.split("_")
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}

	renderPlaceLinks(website, googleUrl) {
		const links = [];
		if (website) links.push(`<a href="${website}" target="_blank" rel="noopener">Website</a>`);
		if (googleUrl) links.push(`<a href="${googleUrl}" target="_blank" rel="noopener">Google listing</a>`);

		if (links.length === 0) return "";

		return `<div class="maps-result-links">${links.join("")}</div>`;
	}

	renderMarkerLinks(website, googleUrl) {
		const links = [];
		if (website) links.push(`<a href="${website}" target="_blank" rel="noopener">Website</a>`);
		if (googleUrl) links.push(`<a href="${googleUrl}" target="_blank" rel="noopener">Google listing</a>`);
		return links.join("");
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
		const count = document.getElementById("placeCount");
		if (count) count.textContent = label;
	}

	countLabel(total, noun) {
		return `${total} ${noun}${total === 1 ? "" : "s"} available`;
	}
}
