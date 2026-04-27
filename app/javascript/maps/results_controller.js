import { clearMarkers, escapeHtml } from "maps/helpers";

export default class ResultsController {
	constructor(mapController, { countId }) {
		this.mapController = mapController;
		this.countId = countId;
		this.markers = [];
		this.infoWindow = new google.maps.InfoWindow();
	}

	resetMarkers() {
		clearMarkers(this.markers);
		this.markers = [];
	}

	updateCountLabel(label) {
		const count = document.getElementById(this.countId);
		if (count) count.textContent = label;
	}

	countLabel(total, noun) {
		return `${total} ${noun}${total === 1 ? "" : "s"} available`;
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

	renderRouteActions(address, { includeOrigin = false } = {}) {
		if (!address) return "";

		const encodedAddress = encodeURIComponent(address);
		const originAction = includeOrigin
			? `<button type="button" class="maps-marker-action" onclick="window.useMarkerOrigin(decodeURIComponent('${encodedAddress}'))">Start Here</button>`
			: "";

		return `
			<div class="maps-marker-actions">
				<button type="button" class="maps-marker-action" onclick="window.useMarkerDestination(decodeURIComponent('${encodedAddress}'))">Route Here</button>
				${originAction}
			</div>
		`;
	}

	renderExternalLinks(links, wrapperClass = "") {
		const markup = links
			.filter(link => link.url)
			.map(link => `<a href="${link.url}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`)
			.join("");

		if (!markup || !wrapperClass) return markup;

		return `<div class="${escapeHtml(wrapperClass)}">${markup}</div>`;
	}
}
