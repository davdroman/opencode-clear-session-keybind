import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

// OpenCode supplies the TUI runtime. Only its identity wrapper is needed here.
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@opencode/plugin/tui") {
      return {
        url: "data:text/javascript,export const Plugin = { define: value => value };",
        shortCircuit: true,
      };
    }
    return next(specifier, context);
  },
});
const { default: plugin } = await import("opencode-clear-session-keybind/tui");
hooks.deregister();

function setup(options) {
  let slot;
  let layer;
  let rendering = false;
  let disposed = false;
  const dispatched = [];
  const dispose = plugin.setup({
    options,
    keymap: {
      layer: (create) => {
        assert.equal(rendering, true, "keymap registration requires the app provider");
        layer = create();
      },
      dispatch: (...args) => dispatched.push(args),
    },
    ui: {
      slot: (claim) => {
        slot = claim;
        return () => { disposed = true; };
      },
    },
  });

  assert.equal(slot.append, "app");
  assert.equal(layer, undefined, "setup must defer keymap registration");
  rendering = true;
  assert.equal(slot.render(), null);
  rendering = false;
  assert.equal(layer.mode, "global");
  assert.equal(layer.commands.length, 1);
  assert.equal(layer.commands[0].id, undefined, "do not replace the built-in command");
  assert.equal(layer.commands[0].palette, undefined);
  assert.deepEqual(dispatched, [], "loading the plugin must not clear a session");

  return { command: layer.commands[0], dispatched, dispose, get disposed() { return disposed; } };
}

test("configured shortcuts dispatch the built-in clear command", () => {
  for (const keybind of ["<leader>c", "ctrl+l", "ctrl+shift+c"]) {
    const ui = setup({ keybind });
    assert.equal(ui.command.bind, keybind);
    ui.command.run();
    assert.deepEqual(ui.dispatched, [["session.clear"]]);
    ui.dispose();
    assert.equal(ui.disposed, true);
  }
});

test("requires a keybind option", () => {
  assert.throws(() => setup({}), /clear-session: keybind must be a non-empty shortcut string/);
});

test("rejects unsupported keybind option values", () => {
  for (const keybind of [false, true, 42, null, [], {}, "", "   "]) {
    assert.throws(() => setup({ keybind }), /clear-session: keybind must be a non-empty shortcut string/);
  }
});
