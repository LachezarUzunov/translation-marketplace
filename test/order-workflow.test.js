import { test } from "node:test";
import assert from "node:assert/strict";
import { TRANSITIONS, nextStatus } from "../srv/lib/order-workflow.js";

test("happy path: Pending -> Accepted -> Delivered -> Completed", () => {
  assert.equal(nextStatus("accept", "Pending").to, "Accepted");
  assert.equal(nextStatus("deliver", "Accepted").to, "Delivered");
  assert.equal(nextStatus("approve", "Delivered").to, "Completed");
});

test("revision loop: Delivered -> RevisionRequested -> Delivered", () => {
  assert.equal(nextStatus("requestRevision", "Delivered").to, "RevisionRequested");
  assert.equal(nextStatus("deliver", "RevisionRequested").to, "Delivered");
});

test("changes loop: Pending -> ChangesRequested -> Pending", () => {
  assert.equal(nextStatus("requestChanges", "Pending").to, "ChangesRequested");
  assert.equal(nextStatus("resubmit", "ChangesRequested").to, "Pending");
});

test("cannot approve before delivery", () => {
  assert.equal(nextStatus("approve", "Accepted").ok, false);
});

test("cannot cancel after the translator accepted", () => {
  assert.equal(nextStatus("cancel", "Accepted").ok, false);
});

test("final statuses have no way out", () => {
  for (const final of ["Completed", "Rejected", "Cancelled"]) {
    for (const action of Object.keys(TRANSITIONS)) {
      assert.equal(nextStatus(action, final).ok, false, `${action} from ${final}`);
    }
  }
});

test("unknown action is refused", () => {
  assert.equal(nextStatus("hack", "Pending").ok, false);
});
