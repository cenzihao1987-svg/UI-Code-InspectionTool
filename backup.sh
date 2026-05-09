#!/bin/bash
# 界面走查工具 - 源代码备份脚本
# 用法: ./backup.sh [备注]
# 示例: ./backup.sh "修复Figma嵌入后备份"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
SRC_DIR="$PROJECT_DIR/src"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
NOTE="${1:-手动备份}"
BACKUP_NAME="src-backup-${TIMESTAMP}"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 执行备份
cp -r "$SRC_DIR" "$BACKUP_PATH"

# 写入备份元数据
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')" > "$BACKUP_PATH.meta.txt"
echo "备注: $NOTE" >> "$BACKUP_PATH.meta.txt"
echo "路径: $BACKUP_PATH" >> "$BACKUP_PATH.meta.txt"

# 保留最近 10 个备份，删除更旧的
ls -dt "$BACKUP_DIR"/src-backup-* 2>/dev/null | tail -n +11 | xargs rm -rf 2>/dev/null

echo "✅ 备份完成: $BACKUP_NAME"
echo "📝 备注: $NOTE"
echo "📂 路径: $BACKUP_PATH"

# 列出当前所有备份
echo ""
echo "📦 现有备份:"
ls -dt "$BACKUP_DIR"/src-backup-* 2>/dev/null | head -10 | while read dir; do
  if [ -f "$dir.meta.txt" ]; then
    echo "  $(basename $dir) - $(grep '备注' $dir.meta.txt | sed 's/备注: //')"
  else
    echo "  $(basename $dir)"
  fi
done
