import { test } from "node:test";
import assert from "node:assert/strict";
import { sistemaSuspenso } from "./suspensao";

test("sistemaSuspenso so liga com valores explicitos", () => {
  for (const v of ["1", "true", "TRUE", " sim ", "yes"]) assert.equal(sistemaSuspenso({ SISTEMA_SUSPENSO: v }), true, v);
  for (const v of [undefined, "", "0", "false", "nao", "talvez"]) assert.equal(sistemaSuspenso({ SISTEMA_SUSPENSO: v }), false, String(v));
});
