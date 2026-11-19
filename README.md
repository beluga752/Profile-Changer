# Profile-Changer

A [Vencord](https://vencord.dev) plugin that lets you customize how your Discord profile looks on your own client: username, badges, banner, account creation date, and more.

> [!NOTE]
> All changes are **client-side only**. Only you can see them. Nobody else will see your custom profile.

---

## Screenshots

<p align="center">
  <img src="https://i.imgur.com/WgJoW6R.png" width="32%" alt="Profile-Changer preview 1" />
  <img src="https://i.imgur.com/CUXJ8UI.png" width="32%" alt="Profile-Changer preview 2" />
  <img src="https://i.imgur.com/TVpxk7c.png" width="32%" alt="Profile-Changer preview 3" />
</p>

---

## Features

- **Username**: change the name displayed on your profile
- **Banner**: set a custom profile banner
- **Account creation date**: change the "Member Since" date
- **Badges**: add or remove any profile badge
- **Nitro badge**: show a Nitro badge
- **Boost badges**: show any server boost level badge
- **Custom badges**: create your own badges with your own icon and tooltip

---

## Installation

You need Vencord built from source, since this is a user plugin.

1. **Set up Vencord from source** by following the [official guide](https://docs.vencord.dev/installing/).

2. **Clone the plugin** into your `userplugins` folder:

   ```bash
   cd Vencord/src
   mkdir -p userplugins
   cd userplugins
   git clone https://github.com/<your-username>/Profile-Changer.git
   ```

3. **Build and inject** Vencord:

   ```bash
   pnpm build
   pnpm inject
   ```

4. **Restart Discord**, then enable the plugin under **Settings → Vencord → Plugins → Profile-Changer**.

---

## Usage

1. Open **Settings → Vencord → Plugins** and find **Profile-Changer**.
2. Click the settings (cog) icon to open the plugin options.
3. Edit your username, banner, creation date and badges.
4. Your profile updates right away on your client.

### Creating a custom badge

1. Open the plugin settings and go to the badges section.
2. Add a new badge and give it a **name** (shown as the tooltip) and an **icon image URL**.
3. Save it, and the badge will appear on your profile.

---

## Disclaimer

This plugin is provided for fun and personal customization only. Client modifications are against Discord's Terms of Service, so use it at your own risk. The author is not responsible for any consequences of using it. Don't use it to impersonate others or mislead people.

---

## Contributing

Issues and pull requests are welcome. If you find a bug or have a feature idea, open an issue.

## License

Add your license here (for example, [MIT](https://choosealicense.com/licenses/mit/)).
