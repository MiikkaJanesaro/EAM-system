import "./setupEnv.js";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { asyncHandler } from "../utils/asyncHandler.js";

describe("asyncHandler", () => {
  test("ei kutsu next():ä kun handler onnistuu", async () => {
    let nextCalled = false;
    const handler = asyncHandler(async () => {});
    await handler({}, {}, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
  });

  test("välittää hylätyn promisen virheen next():lle", async () => {
    const boom = new Error("boom");
    const handler = asyncHandler(async () => {
      throw boom;
    });
    await new Promise((resolve) => {
      handler({}, {}, (err) => {
        assert.equal(err, boom);
        resolve();
      });
    });
  });
});
