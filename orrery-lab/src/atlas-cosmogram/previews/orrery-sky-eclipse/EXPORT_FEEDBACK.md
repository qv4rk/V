# Supplied chat-export feedback

The zip is more useful than copied text: it preserves the conversation Markdown,
an HTML view, metadata, a diagnostic log and extracted code files. There are eight
exported turns, with user/model roles and an export timestamp.

Corrections worth making in the extension:

1. Both shader snippet files are byte-identical. Both camera files are also
   duplicate captures. Deduplicate code by content hash while preserving turn references.
2. The HTML contains 36 image entries, but only two distinct image sources.
   Report image occurrences and unique resources separately.
3. The first user turn is blank. Mark an attachment-only/empty turn explicitly
   rather than implying text was captured. `includeAttachments` is false.
4. The diagnostic audit found zero citation elements, even though citation
   capture was enabled. Preserve an explicit per-turn list of source URLs.
5. One thinking section could not be captured; the metadata correctly records
   that error. Preserve that record, rather than describing the export as complete.

For handing work to another coding session, this structure is substantially
better than unstructured paste. The independent code files and diagnostic log
made the duplication and completeness issues easy to check.
