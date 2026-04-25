self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.url,
        taskId: data.data?.taskId
      },
      actions: data.actions || []
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  
  const taskId = event.notification.data.taskId;
  const action = event.action;

  if (action === "tomorrow" || action === "backlog") {
    // Perform background action
    event.waitUntil(
      fetch("/api/tasks/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action }),
      }).then(() => {
        // Optionally refresh windows
        return clients.matchAll({ type: "window" }).then(windowClients => {
          windowClients.forEach(client => client.navigate(client.url));
        });
      })
    );
  } else {
    // Normal click - open app
    event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
  }
});
