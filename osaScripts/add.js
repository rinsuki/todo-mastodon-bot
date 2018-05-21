var reminders = Application("Reminders")

function run(args) {
    info = JSON.parse(args)
    reminders.lists["Mastodon TODO"].reminders.push(reminders.Reminder(info))
}

