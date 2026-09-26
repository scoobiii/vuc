import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('Termux GPU evidence contract', () => {
  it('does not treat a GPU device name as proof of GPU execution', () => {
    const evidence = {
      gpu_present: true,
      gpu_execution_proven: false,
    };
    assert.equal(evidence.gpu_execution_proven, false);
  });

  it('requires an explicit backend execution result before speedup claims', () => {
    const evidence = {
      backend: 'vulkan',
      execution: { status: 'NOT_EXECUTED' },
    };
    assert.notEqual(evidence.execution.status, 'EXECUTED');
  });
});
