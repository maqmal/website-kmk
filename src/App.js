import React, { useState } from "react";
import * as XLSX from "xlsx";
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { styled } from '@mui/material/styles';
import { tableCellClasses } from '@mui/material/TableCell';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';

import Button from '@mui/material/Button';

function App() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [kursData, setKursData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedCurrencies, setSelectedCurrencies] = useState([]);

  // Table stuff
  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      backgroundColor: theme.palette.common.black,
      color: theme.palette.common.white,
    },
    [`&.${tableCellClasses.body}`]: {
      fontSize: 14,
    },
  }));
  
  const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.action.hover,
    },
    // hide last border
    '&:last-child td, &:last-child th': {
      border: 0,
    },
  }));
  // End of table stuff


  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setLoading(true);
    const selectedDateRange = getSelectedDateRange();
    Promise.all(
      selectedDateRange.map((date) => {
        return fetch(`https://kurs-kmk-api-production.up.railway.app/kurs-pajak?date=${date}`)
          .then((response) => response.json())
          .then((data) => {
            const kursTable = data.KursTable.map((kurs) => ({
              [kurs.MataUang]: kurs.Nilai,
            }));
            const kursDataForDate = kursTable.reduce((prev, current) => {
              return Object.assign(prev, current);
            }, {});
            return { date, kursDataForDate, dasarHukum: data.DasarHukum };
          });
      })
    ).then((results) => {
      const kursData = results.reduce((prev, current) => {
        const { date, kursDataForDate, dasarHukum } = current;
        return {
          ...prev,
          [date]: { ...kursDataForDate, DasarHukum: dasarHukum },
        };
      }, {});
      setKursData(kursData);
      setLoading(false);
    });
  };

  const handleCurrencyChange = (event, currency) => {
    const { checked } = event.target;
  
    setSelectedCurrencies((prevSelectedCurrencies) => {
      if (checked && currency !== "DasarHukum") {
        return [currency, ...prevSelectedCurrencies];
      } else {
        return prevSelectedCurrencies.filter(
          (selectedCurrency) => selectedCurrency !== currency && selectedCurrency !== "DasarHukum"
        );
      }
    });
  };

  const handleSelectAllCurrencies = (event) => {
    if (event.target.checked) {
      const currencies = Object.keys(kursData[Object.keys(kursData)[0]]).filter((currency) => currency !== 'DasarHukum');
      setSelectedCurrencies(currencies);
    } else {
      setSelectedCurrencies([]);
    }
  };

  const getSelectedDateRange = () => {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const dateDiff = (endDateObj - startDateObj) / (1000 * 3600 * 24);
    const selectedDateRange = [];
    for (let i = 0; i <= dateDiff; i++) {
      const currentDate = new Date(startDateObj);
      currentDate.setDate(startDateObj.getDate() + i);
      selectedDateRange.push(currentDate.toISOString().slice(0, 10));
    }
    return selectedDateRange;
  };

  const renderTableHeader = () => {
    const headers = ["Date", "Dasar Hukum", ...selectedCurrencies];
    return headers.map((header) => <StyledTableCell key={header}>{header}</StyledTableCell>);
  };

  const renderTableRows = () => {
    return Object.entries(kursData).map(([date, kursDataForDate]) => {
      const kursDataRow = selectedCurrencies.map((currency) => {
        return <StyledTableCell key={currency}>{formatCurrency(kursDataForDate[currency], currency) || "-"}</StyledTableCell>;
      });
  
      return (
        <StyledTableRow key={date} hover>
          <StyledTableCell>{date}</StyledTableCell>
          <StyledTableCell>{kursDataForDate["DasarHukum"]}</StyledTableCell>
          {kursDataRow}
        </StyledTableRow>
      );
    });
  };

  const renderTable = () => {
    return (
      <Paper sx={{ width: '99%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 540 }}>
          <Table stickyHeader aria-label="sticky table">
          <TableHead>
              <TableRow>
                {renderTableHeader()}
              </TableRow>
            </TableHead>
            <TableBody>
              {renderTableRows()}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };
  
  const formatCurrency = (value, currency) => {
    if (value !== undefined) {
      const formattedValue = value.replace(/\./g, '').replace(',', '.');
      if (currency === "JPY") {
        const valueAsNumber = Number(formattedValue.replace(",", "."));
        const valueDiv = valueAsNumber/100
        return valueDiv;
      }
      return formattedValue.replace('.', ',');
    }
    return '';
  };

  const handleExportExcel = () => {
    setLoading(true);
    setTimeout(() => {
      const dateRange = getSelectedDateRange();
      const data = [
        ["Date", "Dasar Hukum", ...selectedCurrencies],
        ...dateRange.map((date) =>
          [new Date(date).toLocaleDateString('en-GB'), kursData[date]['DasarHukum'], ...selectedCurrencies.map((curr) => formatCurrency(kursData[date][curr], curr))]
        ),
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.sheet_add_aoa(ws, data, {origin: 'A1'});
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, "kurs-pajak.xlsx");
      setLoading(false);
    }, 1000);
  };

  return (
      <div className="App">
      <h1>Database Kurs KMK</h1>
      <Container maxWidth="sm">
        <p>Select date range</p>
        <form onSubmit={handleSubmit}>
            <Stack spacing={1} direction="row" className="date">
              <label htmlFor="start-date">Start Date:</label>
              <input
                type="date"
                id="start-date"
                name="start-date"
                value={startDate}
                onChange={handleStartDateChange}
              />
              <label htmlFor="end-date">End Date:</label>
              <input
                type="date"
                id="end-date"
                name="end-date"
                value={endDate}
                onChange={handleEndDateChange}
              />
            </Stack>
          <br />
          <Button size="small" variant="contained" color="success" type="submit" disabled={loading}>{loading ? "Loading..." : "Get Data"}</Button>
          <br /><br />
          </form>
        </Container>

        {Object.keys(kursData).length > 0 && (
          <div>
            <div>
              <label htmlFor="select-all-currencies">
                Select all currencies:
                <input
                  type="checkbox"
                  id="select-all-currencies"
                  checked={selectedCurrencies.length === 25}
                  onChange={handleSelectAllCurrencies}
                />
              </label>
            </div>
            <br />
            <div>
              {Object.keys(kursData[Object.keys(kursData)[0]])
                .filter((currency) => currency !== "DasarHukum")
                .map((currency) => (
                  <label key={currency}>
                    <input
                      type="checkbox"
                      value={currency}
                      checked={selectedCurrencies.includes(currency)}
                      onChange={(event) => handleCurrencyChange(event, currency)}
                    />
                    {currency}
                  </label>
                ))}
            </div>
            <br />
            <Button size="small" variant="contained" color="success" type="submit" disabled={loading} onClick={handleExportExcel}>{loading ? "Loading..." : "Download to Excel"}</Button>
            <br />
            <br />
            {renderTable()}
          </div>
        )}
      </div>
  );
}

export default App;
