export class DuplicateNovelError extends Error {
  constructor(public readonly name: string) {
    super(`小說名稱「${name}」已存在於 workspace`)
    this.name = 'DuplicateNovelError'
  }
}

export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message)
    this.name = 'SchemaValidationError'
  }
}

export class MissingRelationshipTargetError extends Error {
  constructor(public readonly targetCharacterId: string) {
    super(`relationship 引用了不存在的角色：${targetCharacterId}`)
    this.name = 'MissingRelationshipTargetError'
  }
}

export class FileAccessError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'FileAccessError'
  }
}
