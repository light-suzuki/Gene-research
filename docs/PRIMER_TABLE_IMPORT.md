# Primer table import

Primer Reverse Lookup reads pasted tables, FASTA, `.xlsx`, CSV and TSV locally
in the browser. No workbook is uploaded to the API. Legacy `.xls` files must be
saved as `.xlsx` or copied as cells. Workbook formulas are not executed; cached
values are read. Select the worksheet explicitly.

Automatic pairing prioritizes Fw/Re (including fw/rv) headers and primer-name
suffixes. Without direction information, consecutive rows within each column
are paired independently. Parallel vertical tables are supported. Select the
horizontal layout for headerless two-primer rows.

Position, size, quality and plate-well columns can accompany the sequences.
Directional primer names take priority over preceding plate-well identifiers.
Numbered direction suffixes keep variants separate. Full-width characters,
spaces, IUPAC bases and 5-prime/3-prime notation are normalized. Written
3-prime-to-5-prime sequences are reversed, with a warning, not complemented.

Review names, source cells and sequences before applying. Exclude pairs or swap
their direction when needed. Unpaired entries are displayed and excluded from
search. Automatic parsing cannot establish biological pairing when metadata is
missing. Files are limited to 20 MB, decoded XML to 32 MB, and each import to
500 pairs. Tests use synthetic sequences only.
