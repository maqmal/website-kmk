import React, { useState } from "react";
import * as XLSX from "xlsx";

function App() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [kursData, setKursData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedCurrencies, setSelectedCurrencies] = useState([]);

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
      console.log(kursData);
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
    return headers.map((header) => <th key={header}>{header}</th>);
  };

  const renderTableRows = () => {
    return Object.entries(kursData).map(([date, kursDataForDate]) => {
      const kursDataRow = selectedCurrencies.map((currency) => {
        return <td key={currency}>{formatCurrency(kursDataForDate[currency], currency) || "-"}</td>;
      });
  
      return (
        <tr key={date}>
          <td>{date}</td>
          <td>{kursDataForDate["DasarHukum"]}</td>
          {kursDataRow}
        </tr>
      );
    });
  };

  const renderTable = () => {
    return (
      <table>
        <thead>
          <tr>{renderTableHeader()}</tr>
        </thead>
        <tbody>{renderTableRows()}</tbody>
      </table>
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
      <form onSubmit={handleSubmit}>
        <h1>Database kurs KMK - preview build</h1>
        <h3>Select date range:</h3>
        <label htmlFor="start-date">Start Date:</label>
        &nbsp;
        <input
          type="date"
          id="start-date"
          name="start-date"
          value={startDate}
          onChange={handleStartDateChange}
        />
        <br /><br />
        <label htmlFor="end-date">End Date:</label>
        &nbsp;
        <input
          type="date"
          id="end-date"
          name="end-date"
          value={endDate}
          onChange={handleEndDateChange}
        />
        <br /><br />
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Get Data"}
        </button>
        </form>
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
            <button type="submit" disabled={loading} onClick={handleExportExcel}>
              {loading ? "Loading..." : "Export to Excel"}
            </button>
            <div>{renderTable()}</div>
          </div>
        )}
      </div>
  );
}

export default App;
