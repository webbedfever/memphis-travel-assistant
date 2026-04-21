function bindDeleteButtons() {
	document.querySelectorAll(".delete-planner-item").forEach(button => {
		if (button.dataset.deleteBound === "true") return;
		button.dataset.deleteBound = "true";

		button.addEventListener("click", async e => {
			const clickedButton = e.currentTarget;
			const plannerItemId = clickedButton.dataset.plannerItemId;

			if (!plannerItemId) return;

			try {
				const response = await fetch(`/planner_items/${plannerItemId}`, {
					method: "DELETE",
					headers: {
						"X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
						"Content-Type": "application/json"
					}
				});

				if (!response.ok) {
					throw new Error("Unable to remove planner item");
				}

				const plannerItem = clickedButton.closest(".planner-item");
				if (plannerItem) {
					const plannerDay = plannerItem.closest(".planner-day");
					plannerItem.remove();

					if (plannerDay && !plannerDay.querySelector(".planner-item")) {
						plannerDay.remove();
					}

					if (!document.querySelector(".planner-item")) {
						document.querySelector(".planner-timeline")?.remove();
						const page = document.querySelector(".planner-page");
						if (page && !page.querySelector(".planner-empty")) {
							page.insertAdjacentHTML("beforeend", '<div class="planner-empty">No planner items saved yet.</div>');
						}
					}
				}
			} catch (error) {
				alert(error.message);
				console.error(error);
			}
		});
	});
}

document.addEventListener("turbo:load", bindDeleteButtons);
document.addEventListener("DOMContentLoaded", bindDeleteButtons);
