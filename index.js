import { ApiClient, ApiClientInMemoryContextProvider } from '@northflank/js-client';

const PROJECT_ID = process.env.NORTHFLANK_PROJECT_ID;
const TOKEN = process.env.NORTHFLANK_TOKEN;

if (!TOKEN) {
  console.error('Missing NORTHFLANK_TOKEN environment variable');
  process.exit(1);
}

if (!PROJECT_ID) {
  console.error('Missing NORTHFLANK_PROJECT_ID environment variable');
  process.exit(1);
}

// --- Init SDK ---
console.log('Initializing API client...');
const contextProvider = new ApiClientInMemoryContextProvider();
await contextProvider.addContext({
  name: 'context',
  token: TOKEN,
});
const apiClient = new ApiClient(contextProvider, {
  throwErrorOnHttpErrorCode: true,
});
console.log('API client initialized');

// --- Create sandbox ---
const sandboxId = `sandbox-${crypto.randomUUID().split('-')[4]}`;
console.log(`Creating sandbox service: ${sandboxId}`);

await apiClient.create.service.deployment({
  parameters: { projectId: PROJECT_ID },
  data: {
    name: sandboxId,
    billing: { deploymentPlan: 'nf-compute-200' },
    deployment: {
      instances: 0,
      external: { imagePath: 'ubuntu:22.04' },
      storage: { ephemeralStorage: { storageSize: 2048 } },
    },
  },
});
console.log('Sandbox service created');

// --- Attach volume ---
console.log(`Attaching volume data-${sandboxId} at /workspace...`);
await apiClient.create.volume({
  parameters: { projectId: PROJECT_ID },
  data: {
    name: `data-${sandboxId}`,
    mounts: [{ containerMountPath: '/workspace' }],
    spec: {
      accessMode: 'ReadWriteMany',
      storageClassName: 'ssd',
      storageSize: 10240,
    },
    attachedObjects: [{ id: sandboxId, type: 'service' }],
  },
});
console.log('Volume attached');

// --- Boot ---
console.log('Scaling sandbox to 1 instance...');
await apiClient.scale.service({
  parameters: { projectId: PROJECT_ID, serviceId: sandboxId },
  data: { instances: 1 },
});
console.log('Waiting for sandbox to be ready...');

// Wait for ready
while (true) {
  const svc = await apiClient.get.service({
    parameters: { projectId: PROJECT_ID, serviceId: sandboxId },
  });
  const status = svc.data?.status?.deployment?.status;
  if (status === 'COMPLETED') break;
  if (status === 'FAILED') throw new Error('Sandbox failed to start');
  console.log(`  Status: ${status ?? 'PENDING'}`);
  await new Promise((r) => setTimeout(r, 1000));
}
console.log('Sandbox is ready');

// --- Execute code ---
console.log('Executing command: echo \'Hello from the sandbox!\'');
const handle = await apiClient.exec.execServiceSession(
  { projectId: PROJECT_ID, serviceId: sandboxId },
  { shell: 'bash -c', command: "echo 'Hello from the sandbox!'" }
);

const stdout = [];
handle.stdOut.on('data', (d) => stdout.push(d.toString()));
const result = await handle.waitForCommandResult();
console.log(`Command finished with exit code ${result.exitCode}`);
console.log(`Output: ${stdout.join('')}`);

// --- Cleanup ---
console.log(`Deleting sandbox service ${sandboxId}...`);
await apiClient.delete.service({
  parameters: { projectId: PROJECT_ID, serviceId: sandboxId },
});
console.log('Sandbox deleted. Done.');
