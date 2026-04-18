function bindDeleteButtons() {
	document.querySelectorAll(".delete-planner-item").forEach(button => {
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
					plannerItem.remove();
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