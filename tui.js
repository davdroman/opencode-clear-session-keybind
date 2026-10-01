import { Plugin } from "@opencode/plugin/tui";

export default Plugin.define({
  id: "clear-session",
  setup(context) {
    const keybind = context.options.keybind;
    if (typeof keybind !== "string" || keybind.trim() === "") {
      throw new TypeError("clear-session: keybind must be a non-empty shortcut string");
    }

    return context.ui.slot({
      append: "app",
      render() {
        context.keymap.layer(() => ({
          mode: "global",
          commands: [{
            bind: keybind,
            title: "Clear session",
            run: () => context.keymap.dispatch("session.clear"),
          }],
        }));
        return null;
      },
    });
  },
});
