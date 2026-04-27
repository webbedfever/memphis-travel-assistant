import {
	bindDirectionAddressButtons,
	escapeHtml,
	normalizeRange,
	plannerDateTime,
	renderStateCard,
	sanitizeUrl,
	timeToMinutes
} from "maps/helpers";
import { bindPlannerButtons, syncPlannerButtons } from "maps/planner_state";
import ResultsController from "maps/results_controller";

export default class PlacesController extends ResultsController {
	constructor(mapController) {
		super(mapController, { countId: "placeCount" });
	}

	async load() {
		this.resetMarkers();

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
		const endDate = document.getElementById("endDate").value;
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
				endDate,
				startTime,
				endTime,
				openNowOnly
			});

			this.updateCountLabel(this.countLabel(places.length, "place"));
			this.renderList(places, type, { date, endDate, startTime, endTime });
			this.renderMarkers(places);
			this.bindPlannerButtons();
		} catch (error) {
			this.updateCountLabel("Unavailable");
			container.innerHTML = renderStateCard(
				"Unable to load places",
				"We could not reach nearby places right now. Try again in a moment.",
				{ scope: "places", label: "Retry places" }
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
			const dateOptions = this.dateOptions(filters.date, filters.endDate);
			const startTime = filters.startTime || "";
			const endTime = filters.endTime || "";
			const placePayload = {
				title: place.name,
				item_type: "place",
				location_name: place.name,
				address: place.address,
				latitude: place.lat,
				longitude: place.lng,
				source: "google_places",
				category: type || place.category,
				rating: place.rating,
				open_now: place.open_now,
				weekday_text: place.weekday_text || [],
				phone: place.phone,
				website: place.website,
				google_url: place.google_url,
				place_id: place.place_id
			};
			const payload = this.encodedPlannerPayload(placePayload, selectedDate, { startTime, endTime });
			const encodedPlacePayload = encodeURIComponent(JSON.stringify(placePayload));
			const dateSelect = this.renderPlaceDateSelect(dateOptions, selectedDate);

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
						<div class="maps-save-controls">
							${dateSelect}
							<button
								type="button"
								class="add-to-planner-button planner-inline-action"
								data-item="${payload}"
								data-place-payload="${encodedPlacePayload}"
								data-start-time="${escapeHtml(startTime)}"
								data-end-time="${escapeHtml(endTime)}"
								aria-label="Save ${name} to planner">
								Save
							</button>
						</div>
					</div>
				</div>
			`;
		}).join("");

		this.bindPlaceDateSelects(container);
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
						${this.renderRouteActions(address, { includeOrigin: true })}
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
		return this.renderExternalLinks([
			{ label: "Website", url: website },
			{ label: "Google listing", url: googleUrl }
		], "maps-result-links");
	}

	renderMarkerLinks(website, googleUrl) {
		return this.renderExternalLinks([
			{ label: "Website", url: website },
			{ label: "Google listing", url: googleUrl }
		]);
	}

	dateOptions(startDate, endDate) {
		if (!startDate) return [];

		const start = new Date(`${startDate}T00:00:00`);
		const end = new Date(`${endDate || startDate}T00:00:00`);
		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [startDate];

		const options = [];
		const current = new Date(start);
		while (current <= end && options.length < 31) {
			options.push(current.toLocaleDateString("en-CA"));
			current.setDate(current.getDate() + 1);
		}

		return options;
	}

	renderPlaceDateSelect(dateOptions, selectedDate) {
		if (dateOptions.length <= 1) return "";

		const options = dateOptions.map(date => {
			const label = new Date(`${date}T00:00:00`).toLocaleDateString([], {
				weekday: "short",
				month: "short",
				day: "numeric"
			});
			return `<option value="${escapeHtml(date)}" ${date === selectedDate ? "selected" : ""}>${escapeHtml(label)}</option>`;
		}).join("");

		return `
			<label class="maps-date-choice">
				<span>Save for</span>
				<select aria-label="Choose date for saved place">${options}</select>
			</label>
		`;
	}

	bindPlaceDateSelects(container) {
		container.querySelectorAll(".maps-date-choice select").forEach(select => {
			if (select.dataset.dateChoiceBound === "true") return;
			select.dataset.dateChoiceBound = "true";

			select.addEventListener("change", () => {
				const button = select.closest(".maps-save-controls")?.querySelector(".add-to-planner-button");
				if (!button) return;

				const payload = JSON.parse(decodeURIComponent(button.dataset.placePayload));
				button.dataset.item = this.encodedPlannerPayload(payload, select.value, {
					startTime: button.dataset.startTime || "",
					endTime: button.dataset.endTime || ""
				});
				button.textContent = "Save";
				button.disabled = false;
				delete button.dataset.saved;
			});
		});
	}

	encodedPlannerPayload(placePayload, selectedDate, filters) {
		const baseExternalId = placePayload.place_id || `google-place-${placePayload.title}-${placePayload.latitude}-${placePayload.longitude}`;
		const weekdayText = Array.isArray(placePayload.weekday_text) ? placePayload.weekday_text : [];
		const selectedDay = this.weekdayLabel(selectedDate);
		const payload = {
			...placePayload,
			start_time: selectedDate ? plannerDateTime(selectedDate, filters.startTime) : null,
			end_time: selectedDate && filters.startTime && filters.endTime ? plannerDateTime(selectedDate, filters.endTime) : null,
			external_id: selectedDate ? `${baseExternalId}-${selectedDate}` : baseExternalId,
			hours_day: selectedDay,
			hours_for_day: this.hoursForDate(weekdayText, selectedDate)
		};

		delete payload.weekday_text;
		delete payload.place_id;

		return encodeURIComponent(JSON.stringify(payload));
	}

	weekdayLabel(date) {
		if (!date) return "";

		return new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: "long" });
	}

	hoursForDate(weekdayText, date) {
		if (!date || !Array.isArray(weekdayText) || weekdayText.length === 0) return "";

		const day = new Date(`${date}T00:00:00`).getDay();
		return weekdayText[(day + 6) % 7] || "";
	}
}
