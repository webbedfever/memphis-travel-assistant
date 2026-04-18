export function clearMarkers(markers) {
	markers.forEach(marker => marker.setMap(null));
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
				events: []
			};
		}

		grouped[key].events.push(event);
	});

	return Object.values(grouped);
}

export function filterOpenPlaces(places) {
	return places.filter(place => place.open_now === true);
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
