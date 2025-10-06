import protobuf from 'protobufjs';

import type { StateEntry } from '@/types/stream';

const StreamEntryProto = new protobuf.Type('StreamEntry')
  .add(new protobuf.Field('owner', 1, 'string'))
  .add(new protobuf.Field('topic', 2, 'string'))
  .add(new protobuf.Field('title', 3, 'string'))
  .add(new protobuf.Field('state', 4, 'string'))
  .add(new protobuf.Field('mediaType', 5, 'string'))
  .add(new protobuf.Field('createdAt', 6, 'uint64', 'optional'))
  .add(new protobuf.Field('updatedAt', 7, 'uint64', 'optional'))
  .add(new protobuf.Field('index', 8, 'uint32', 'optional'))
  .add(new protobuf.Field('duration', 9, 'uint32', 'optional'))
  .add(new protobuf.Field('thumbnail', 10, 'string', 'optional'))
  .add(new protobuf.Field('description', 11, 'string', 'optional'))
  .add(new protobuf.Field('scheduledStartTime', 12, 'string', 'optional'))
  .add(new protobuf.Field('pinned', 13, 'bool', 'optional'));

const StreamListProto = new protobuf.Type('StreamList')
  .add(StreamEntryProto)
  .add(new protobuf.Field('entries', 1, 'StreamEntry', 'repeated'));

export function decodeStreamList(payload: Uint8Array): StateEntry[] {
  const decoded = StreamListProto.decode(payload);
  const object = StreamListProto.toObject(decoded, {
    longs: String,
    enums: String,
    bytes: String,
  });

  return object.entries || [];
}
