import type {
  BaseCheckpointSaver,
  Checkpoint,
  CheckpointMetadata,
  CheckpointTuple,
  PendingWrite,
  RunnableConfig,
} from "@langchain/langgraph-checkpoint";
import { MemorySaver } from "@langchain/langgraph";

export function createAgentCheckpointer(): BaseCheckpointSaver {
  return new MemorySaver();
}

export class PgliteCheckpointer implements BaseCheckpointSaver {
  async getTuple(_config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    return undefined;
  }

  async *list(
    _config: RunnableConfig,
    _options?: { limit?: number; before?: RunnableConfig },
  ): AsyncGenerator<CheckpointTuple> {}

  async put(
    _config: RunnableConfig,
    _checkpoint: Checkpoint,
    _metadata: CheckpointMetadata,
    _newVersions: Record<string, number | string>,
  ): Promise<RunnableConfig> {
    return _config;
  }

  async putWrites(
    _config: RunnableConfig,
    _writes: PendingWrite[],
    _taskId: string,
  ): Promise<void> {}
}
