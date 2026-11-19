// The browser bundle of exceljs has no own typings; reuse the package's.
declare module 'exceljs/dist/exceljs.min.js' {
  import ExcelJS from 'exceljs'
  export default ExcelJS
}
