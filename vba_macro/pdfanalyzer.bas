Sub pdfAnalyze()

    Dim dateiname, seite, auftrag, firma, name, datum, kategorie, text, stunden, summeStunden, anzahlTexte As String
    dateiname = "Dateiname"
    seite = "Seite"
    auftrag = "Auftrag"
    firma = "Firma"
    name = "Name"
    datum = "Datum"
    kategorie = "Kategorie"
    text = "Text"
    stunden = "Stunden"
    summeStunden = "Summe Stunden"
    anzahlTexte = "Anzahl Rapporte"
    Dim pivotName1
    pivotName1 = "Kat.,Name,Datum"

    ActiveSheet.name = "Stundenrapporte"

    ' Kopfzeile einfügen und Beschriften
    Rows("1:1").Insert Shift:=xlDown, CopyOrigin:=xlFormatFromLeftOrAbove
    Range("A1").FormulaR1C1 = dateiname
    Range("B1").FormulaR1C1 = seite
    Range("C1").FormulaR1C1 = auftrag
    Range("D1").FormulaR1C1 = firma
    Range("E1").FormulaR1C1 = name
    Range("F1").FormulaR1C1 = datum
    Range("G1").FormulaR1C1 = kategorie
    Range("H1").FormulaR1C1 = text
    Range("I1").FormulaR1C1 = stunden


    'Get Last Cell in a series of data
    Dim lastCell As Range
    Set lastCell = Range("A1").End(xlToRight).End(xlDown)

    ' Bar for Anzahl Stunden
    Dim barsRange As Range
    Dim dataBar As dataBar
    Set lastCell = Range("A1").End(xlToRight).End(xlDown)
    Set barsRange = Range("I2:I" & (lastCell.Row))
    Set dataBar = barsRange.FormatConditions.AddDatabar
    dataBar.BarBorder.Type = xlDataBarBorderSolid

    ' Format data as Excel-Table
    Dim dataTableRange As Range
    Dim dataTable As ListObject
    Set dataTableRange = ActiveSheet.Range("$A$1:$I$" & lastCell.Row)
    Set dataTable = ActiveSheet.ListObjects.Add(xlSrcRange, dataTableRange, , xlYes, , "TableStyleMedium15")

    ' Spaltenbreite
    Columns("A:I").EntireColumn.AutoFit
    Columns("H:H").ColumnWidth = 100

    ' Add new sheet with pivot table
    Dim newSheet As Worksheet
    Sheets.Add.name = pivotName1
    Dim pivotCache As pivotCache
    Dim pivotTable As pivotTable
    'newSheet.name = pivotName1
    Set pivotCache = ActiveWorkbook.PivotCaches.Create(xlDatabase, dataTable)
    pivotCache.RefreshOnFileOpen = True
    Set pivotTable = pivotCache.CreatePivotTable(Sheets(pivotName1).Cells(1, 1))
    pivotTable.PivotFields(datum).Orientation = xlRowField
    pivotTable.AddDataField pivotTable.PivotFields(stunden), summeStunden, xlSum
    pivotTable.AddDataField pivotTable.PivotFields(text), anzahlTexte, xlCount

    ' Bar
    Set lastCell = Sheets(pivotName1).Range("A1").End(xlToRight).End(xlDown)
    ' Anzahl Stunden
    Set barsRange = Sheets(pivotName1).Range("B3:B" & (lastCell.Row - 1)) ' leave out total row
    Set dataBar = barsRange.FormatConditions.AddDatabar
    dataBar.BarBorder.Type = xlDataBarBorderSolid
    ' Anzahl Rapporte
    Set barsRange = Sheets(pivotName1).Range("C3:C" & (lastCell.Row - 1)) ' leave out total row
    Set dataBar = barsRange.FormatConditions.AddDatabar
    dataBar.BarBorder.Type = xlDataBarBorderSolid

    ' add name col
    pivotTable.PivotFields(name).Orientation = xlRowField
    pivotTable.PivotFields(name).Position = 1

    ' add Kategorie col
    pivotTable.PivotFields(kategorie).Orientation = xlRowField
    pivotTable.PivotFields(kategorie).Position = 1

    ' don't save pivot table; regenerate on open; keeps filesize small
    pivotTable.SaveData = False

    ' select top
    Sheets(pivotName1).Cells(1, 1).Select
End Sub



