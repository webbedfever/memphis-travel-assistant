function weatherPageElement() {
	return document.getElementById("weatherPage");
}

function csrfToken() {
	return document.querySelector('meta[name="csrf-token"]')?.content;
}

function formatNumber(value, suffix = "") {
	if (value === null || value === undefined || value === "") return "N/A";
	return `${Math.round(Number(value))}${suffix}`;
}

function formatTimestamp(timestamp) {
	if (!timestamp) return "Unavailable";

	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return "Unavailable";

	return date.toLocaleString([], {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit"
	});
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, character => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;"
	})[character]);
}

function renderStateCard(title, message, action = null) {
	const actionMarkup = action
		? `<button type="button" class="weather-state-action" data-weather-retry>${escapeHtml(action.label || "Retry")}</button>`
		: "";

	return `
		<div class="weather-state-card">
			<strong>${escapeHtml(title)}</strong>
			<p>${escapeHtml(message)}</p>
			${actionMarkup}
		</div>
	`;
}

function normalizedConditionLabel(value) {
	if (!value) return "Weather";

	return String(value)
		.toLowerCase()
		.replace(/_/g, " ")
		.replace(/\b\w/g, char => char.toUpperCase());
}

function normalizeConditionBucket(item) {
	const condition = `${item.condition_type || ""} ${item.condition_text || ""}`.toLowerCase();
	const temperature = Number(item.temperature ?? item.max_temperature ?? 0);
	const windSpeed = Number(item.wind_speed || 0);

	if (condition.includes("thunder") || condition.includes("storm")) return "storm";
	if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("showers")) return "rain";
	if (temperature <= 45) return "cold";
	if (temperature >= 85) return "hot";
	if (windSpeed >= 15) return "windy";
	if (condition.includes("cloud")) return "cloudy";
	if (condition.includes("clear") || condition.includes("sun")) return "clear";

	return "";
}

function buildPrepSuggestions(focus) {
	const suggestions = [];
	const temperature = Number(focus.temperature ?? focus.max_temperature ?? 0);
	const precipitation = Number(focus.precipitation_probability || 0);
	const thunderstorm = Number(focus.thunderstorm_probability || 0);
	const uvIndex = Number(focus.uv_index || 0);
	const windSpeed = Number(focus.wind_speed || 0);
	const humidity = Number(focus.humidity || 0);
	const focusLabel = focus.time_label || focus.weekday_label || "today";
	const focusTime = focus.starts_at || new Date().toISOString();

	if (precipitation >= 40) {
		suggestions.push({
			key: "umbrella",
			title: "Pack an umbrella",
			description: `${precipitation}% precipitation risk around ${focusLabel}. A rain jacket would help too.`,
			startTime: focusTime
		});
	}

	if (thunderstorm >= 20) {
		suggestions.push({
			key: "storm-plan",
			title: "Keep an indoor backup plan",
			description: `${thunderstorm}% thunderstorm risk means it is smart to have a covered option in mind.`,
			startTime: focusTime
		});
	}

	if (temperature <= 45) {
		suggestions.push({
			key: "coat",
			title: "Bring a warm coat",
			description: `It will feel chilly around ${focusLabel}, so heavier layers will help.`,
			startTime: focusTime
		});
	} else if (temperature <= 60) {
		suggestions.push({
			key: "jacket",
			title: "Take a light jacket",
			description: `Cool temperatures are expected around ${focusLabel}.`,
			startTime: focusTime
		});
	}

	if (temperature >= 85) {
		suggestions.push({
			key: "water",
			title: "Carry water and dress light",
			description: `Hot Memphis weather is expected, so breathable clothes and hydration will help.`,
			startTime: focusTime
		});
	}

	if (uvIndex >= 6 && focus.is_daytime !== false) {
		suggestions.push({
			key: "sun",
			title: "Bring sunscreen and sunglasses",
			description: `UV index ${uvIndex} is high enough to plan for sun protection.`,
			startTime: focusTime
		});
	}

	if (windSpeed >= 15) {
		suggestions.push({
			key: "wind",
			title: "Add a wind layer",
			description: `Winds around ${windSpeed} mph could make the day feel rougher than the temperature suggests.`,
			startTime: focusTime
		});
	}

	if (humidity >= 75 && temperature >= 75) {
		suggestions.push({
			key: "humidity",
			title: "Wear breathable clothes",
			description: "Warm, humid weather can feel heavier than the temperature alone suggests.",
			startTime: focusTime
		});
	}

	if (suggestions.length === 0) {
		suggestions.push({
			key: "steady",
			title: "Light layers should be enough",
			description: "Conditions look fairly manageable, so a normal day bag and a light layer should cover it.",
			startTime: focusTime
		});
	}

	return suggestions;
}

class WeatherPage {
	constructor(root) {
		this.root = root;
		this.data = null;
		this.current = document.getElementById("weatherCurrent");
		this.suggestions = document.getElementById("weatherSuggestions");
		this.forecast = document.getElementById("weatherForecast");
		this.updatedAt = document.getElementById("weatherUpdatedAt");
		this.forecastSummary = document.getElementById("weatherForecastSummary");
		this.suggestionFocus = document.getElementById("weatherSuggestionFocus");
		this.viewInput = document.getElementById("weatherView");
		this.dateInput = document.getElementById("weatherDate");
		this.timeInput = document.getElementById("weatherTime");
		this.conditionInput = document.getElementById("weatherConditionFilter");
		this.precipitationOnlyButton = document.getElementById("precipitationOnlyButton");
	}

	init() {
		document.getElementById("applyWeatherFilters")?.addEventListener("click", () => this.render());
		document.getElementById("resetWeatherFilters")?.addEventListener("click", () => this.resetFilters());
		this.root.addEventListener("click", event => {
			if (event.target.closest("[data-weather-retry]")) {
				this.load();
			}
		});
		this.precipitationOnlyButton?.addEventListener("click", () => {
			const pressed = this.precipitationOnlyButton.getAttribute("aria-pressed") === "true";
			this.precipitationOnlyButton.setAttribute("aria-pressed", String(!pressed));
		});

		this.load();
	}

	async load() {
		this.current.innerHTML = renderStateCard("Loading weather", "Pulling the latest Memphis conditions and forecast.");
		this.suggestions.innerHTML = renderStateCard("Loading suggestions", "Building weather prep ideas for the day.");
		this.forecast.innerHTML = renderStateCard("Loading forecast", "Checking the next forecast windows for Memphis.");

		try {
			const response = await fetch("/weather.json", {
				headers: {
					Accept: "application/json"
				}
			});
			const payload = await response.json().catch(() => ({}));
			if (!response.ok || payload.error) {
				throw new Error(payload.message || payload.error || "Unable to load weather");
			}

			this.data = payload;
			this.render();
		} catch (error) {
			const markup = renderStateCard(
				"Weather unavailable",
				error.message || "Unable to load weather. You can still build the trip and check conditions again shortly.",
				{ label: "Retry weather" }
			);
			this.current.innerHTML = markup;
			this.suggestions.innerHTML = markup;
			this.forecast.innerHTML = markup;
			this.updatedAt.textContent = "Unavailable";
			this.forecastSummary.textContent = "Unavailable";
		}
	}

	resetFilters() {
		this.dateInput.value = "";
		this.timeInput.value = "";
		this.viewInput.value = "hourly";
		this.conditionInput.value = "";
		this.precipitationOnlyButton.setAttribute("aria-pressed", "false");
		this.render();
	}

	render() {
		if (!this.data) return;

		this.renderCurrent();
		this.renderForecastAndSuggestions();
	}

	renderCurrent() {
		const current = this.data.current || {};
		this.updatedAt.textContent = formatTimestamp(current.observed_at);

		this.current.innerHTML = `
			<div class="weather-current-top">
				<div>
					<p class="weather-current-label">${normalizedConditionLabel(current.condition_text)}</p>
					<h3>${formatNumber(current.temperature, "°")}</h3>
					<p class="weather-current-subtitle">Feels like ${formatNumber(current.feels_like, "°")}</p>
				</div>
				<div class="weather-current-badges">
					<span>${current.is_daytime ? "Daytime" : "Nighttime"}</span>
					<span>${formatNumber(current.precipitation_probability, "% precip")}</span>
				</div>
			</div>

			<div class="weather-metric-grid">
				<div class="weather-metric-card">
					<span>Humidity</span>
					<strong>${formatNumber(current.humidity, "%")}</strong>
				</div>
				<div class="weather-metric-card">
					<span>Wind</span>
					<strong>${formatNumber(current.wind_speed)} ${current.wind_unit === "MILES_PER_HOUR" ? "mph" : ""}</strong>
				</div>
				<div class="weather-metric-card">
					<span>UV Index</span>
					<strong>${formatNumber(current.uv_index)}</strong>
				</div>
				<div class="weather-metric-card">
					<span>Cloud Cover</span>
					<strong>${formatNumber(current.cloud_cover, "%")}</strong>
				</div>
			</div>
		`;
	}

	renderForecastAndSuggestions() {
		const forecastItems = this.filteredForecastItems();
		const focusItem = this.focusItem(forecastItems);
		const suggestions = buildPrepSuggestions(focusItem || this.data.current || {});

		this.forecastSummary.textContent = `${forecastItems.length} item${forecastItems.length === 1 ? "" : "s"} shown`;
		this.suggestionFocus.textContent = focusItem
			? `Based on ${focusItem.weekday_label || ""} ${focusItem.time_label || ""}`.trim()
			: "Based on current conditions";

		if (forecastItems.length === 0) {
			this.forecast.innerHTML = renderStateCard(
				"No forecast matches",
				"Try widening the filters or switching between hourly and daily forecast."
			);
		} else if (this.viewInput.value === "daily") {
			this.forecast.innerHTML = forecastItems.map(item => this.renderDailyCard(item)).join("");
		} else {
			this.forecast.innerHTML = forecastItems.map(item => this.renderHourlyCard(item)).join("");
		}

		this.suggestions.innerHTML = suggestions.map(suggestion => this.renderSuggestionCard(suggestion, focusItem)).join("");
		this.bindSuggestionButtons(focusItem);
	}

	filteredForecastItems() {
		const items = this.viewInput.value === "daily" ? (this.data.daily || []) : (this.data.hourly || []);
		const selectedDate = this.dateInput.value;
		const selectedTime = this.timeInput.value;
		const selectedCondition = this.conditionInput.value;
		const precipitationOnly = this.precipitationOnlyButton.getAttribute("aria-pressed") === "true";

		return items.filter(item => {
			if (selectedDate && item.date !== selectedDate) return false;

			if (selectedTime && this.viewInput.value === "hourly") {
				const itemHour = (item.time_label || "").toUpperCase();
				const selectedHour = this.timeLabelFromInput(selectedTime);
				if (itemHour !== selectedHour) return false;
			}

			if (selectedCondition && normalizeConditionBucket(item) !== selectedCondition) return false;
			if (precipitationOnly && Number(item.precipitation_probability || 0) < 20) return false;

			return true;
		});
	}

	focusItem(items) {
		if (items.length === 0) return null;
		return items[0];
	}

	timeLabelFromInput(value) {
		if (!value) return "";

		const [hours, minutes] = value.split(":").map(Number);
		const date = new Date();
		date.setHours(hours, minutes, 0, 0);
		return date.toLocaleTimeString([], {
			hour: "numeric",
			minute: "2-digit"
		}).toUpperCase();
	}

	renderHourlyCard(item) {
		return `
			<article class="weather-forecast-card">
				<div class="weather-forecast-top">
					<div>
						<p>${item.weekday_label}</p>
						<h3>${item.time_label}</h3>
					</div>
					<span>${normalizedConditionLabel(item.condition_text)}</span>
				</div>
				<div class="weather-forecast-metrics">
					<span>${formatNumber(item.temperature, "°")}</span>
					<span>Feels like ${formatNumber(item.feels_like, "°")}</span>
					<span>${formatNumber(item.precipitation_probability, "% precip")}</span>
					<span>${formatNumber(item.wind_speed)} ${item.wind_unit === "MILES_PER_HOUR" ? "mph" : ""}</span>
				</div>
			</article>
		`;
	}

	renderDailyCard(item) {
		return `
			<article class="weather-forecast-card weather-forecast-card-daily">
				<div class="weather-forecast-top">
					<div>
						<p>${item.date}</p>
						<h3>${item.weekday_label}</h3>
					</div>
					<span>${normalizedConditionLabel(item.daytime_condition_text || item.nighttime_condition_text)}</span>
				</div>
				<div class="weather-forecast-metrics">
					<span>High ${formatNumber(item.max_temperature, "°")}</span>
					<span>Low ${formatNumber(item.min_temperature, "°")}</span>
					<span>${formatNumber(item.precipitation_probability, "% precip")}</span>
					<span>${formatNumber(item.uv_index)} UV</span>
				</div>
				<p class="weather-forecast-copy">
					Day: ${normalizedConditionLabel(item.daytime_condition_text)}. Night: ${normalizedConditionLabel(item.nighttime_condition_text)}.
				</p>
			</article>
		`;
	}

	renderSuggestionCard(suggestion, focusItem) {
		const signedIn = this.root.dataset.signedIn === "true";
		const plannerPayload = encodeURIComponent(JSON.stringify({
			title: suggestion.title,
			item_type: "weather_prep",
			location_name: "Memphis, TN",
			start_time: suggestion.startTime || focusItem?.starts_at,
			external_id: `weather-prep-${suggestion.key}-${suggestion.startTime || focusItem?.starts_at || "current"}`,
			source: "weather",
			category: "Weather Prep",
			notes: suggestion.description
		}));

		return `
			<article class="weather-suggestion-card">
				<div>
					<h3>${suggestion.title}</h3>
					<p>${suggestion.description}</p>
				</div>
				${signedIn
					? `<button type="button" class="weather-suggestion-save" data-item="${plannerPayload}">Add to Planner</button>`
					: `<a class="weather-suggestion-login" href="${this.root.dataset.signInPath}">Log in to save</a>`}
			</article>
		`;
	}

	bindSuggestionButtons() {
		this.suggestions.querySelectorAll(".weather-suggestion-save").forEach(button => {
			if (button.dataset.bound === "true") return;
			button.dataset.bound = "true";

			button.addEventListener("click", async () => {
				const rawItem = button.dataset.item;
				if (!rawItem) return;

				try {
					const response = await fetch("/planner_items", {
						method: "POST",
						headers: {
							Accept: "application/json",
							"Content-Type": "application/json",
							"X-CSRF-Token": csrfToken()
						},
						body: JSON.stringify({
							planner_item: JSON.parse(decodeURIComponent(rawItem))
						})
					});

					const payload = await response.json();
					if (!response.ok) {
						throw new Error(payload.errors?.join(", ") || "Unable to save suggestion");
					}

					button.textContent = "Saved";
					button.disabled = true;
				} catch (error) {
					window.alert(error.message);
				}
			});
		});
	}
}

function mountWeatherPage() {
	const root = weatherPageElement();
	if (!root) return;

	new WeatherPage(root).init();
}

document.addEventListener("turbo:load", mountWeatherPage);
document.addEventListener("DOMContentLoaded", mountWeatherPage);
