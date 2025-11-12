'use client';

import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ColGroupDef, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { OptionQuote } from '@/lib/theta-client';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface OptionsTableProps {
  calls: OptionQuote[];
  puts: OptionQuote[];
  underlyingPrice: number;
}

interface OptionsRow {
  strike: number;
  callVolume: number;
  callOI: number;
  callBid: number;
  callAsk: number;
  callLast: number;
  putLast: number;
  putBid: number;
  putAsk: number;
  putOI: number;
  putVolume: number;
  isATM: boolean;
}

export function OptionsTable({ calls, puts, underlyingPrice }: OptionsTableProps) {
  // Find ATM strike
  const atmStrike = useMemo(() => {
    return calls.reduce((prev, curr) =>
      Math.abs(curr.strike - underlyingPrice) < Math.abs(prev.strike - underlyingPrice)
        ? curr
        : prev
    )?.strike || underlyingPrice;
  }, [calls, underlyingPrice]);

  // Transform data into row format
  const rowData = useMemo<OptionsRow[]>(() => {
    const strikes = [...new Set([...calls.map((c) => c.strike), ...puts.map((p) => p.strike)])].sort(
      (a, b) => a - b
    );

    return strikes.map((strike) => {
      const call = calls.find((c) => c.strike === strike);
      const put = puts.find((p) => p.strike === strike);

      return {
        strike,
        callVolume: call?.volume || 0,
        callOI: call?.openInterest || 0,
        callBid: call?.bid || 0,
        callAsk: call?.ask || 0,
        callLast: call?.last || 0,
        putLast: put?.last || 0,
        putBid: put?.bid || 0,
        putAsk: put?.ask || 0,
        putOI: put?.openInterest || 0,
        putVolume: put?.volume || 0,
        isATM: strike === atmStrike,
      };
    });
  }, [calls, puts, atmStrike]);

  // Format helpers
  const formatPrice = (value: number) => {
    if (value === 0) return '-';
    return value.toFixed(2);
  };

  const formatVolume = (value: number) => {
    if (value === 0) return '-';
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  // Column definitions
  const columnDefs = useMemo<(ColDef<OptionsRow> | ColGroupDef<OptionsRow>)[]>(
    () => [
      // CALLS GROUP
      {
        headerName: 'CALLS',
        children: [
          {
            field: 'callVolume',
            headerName: 'Vol',
            valueFormatter: (params) => formatVolume(params.value),
            cellStyle: { textAlign: 'right' },
          },
          {
            field: 'callOI',
            headerName: 'OI',
            valueFormatter: (params) => formatVolume(params.value),
            cellStyle: { textAlign: 'right' },
          },
          {
            field: 'callBid',
            headerName: 'Bid',
            valueFormatter: (params) => formatPrice(params.value),
            cellStyle: {
              textAlign: 'right',
              color: '#15803d',
            },
          },
          {
            field: 'callAsk',
            headerName: 'Ask',
            valueFormatter: (params) => formatPrice(params.value),
            cellStyle: {
              textAlign: 'right',
              color: '#15803d',
            },
          },
          {
            field: 'callLast',
            headerName: 'Last',
            valueFormatter: (params) => formatPrice(params.value),
            cellStyle: {
              textAlign: 'right',
              color: '#15803d',
              fontWeight: 'bold',
            },
          },
        ],
      },

      // STRIKE
      {
        field: 'strike',
        headerName: 'STRIKE',
        flex: 1,
        minWidth: 100,
        cellStyle: (params) => {
          const style: Record<string, string> = {
            textAlign: 'center',
            fontWeight: 'bold',
          };
          if (params.data?.isATM) {
            style.backgroundColor = '#fcd34d';
          }
          return style;
        },
        valueFormatter: (params) => params.value.toFixed(0),
      },

      // PUTS GROUP
      {
        headerName: 'PUTS',
        children: [
          {
            field: 'putLast',
            headerName: 'Last',
            valueFormatter: (params) => formatPrice(params.value),
            cellStyle: {
              textAlign: 'right',
              color: '#b91c1c',
              fontWeight: 'bold',
            },
          },
          {
            field: 'putBid',
            headerName: 'Bid',
            valueFormatter: (params) => formatPrice(params.value),
            cellStyle: {
              textAlign: 'right',
              color: '#b91c1c',
            },
          },
          {
            field: 'putAsk',
            headerName: 'Ask',
            valueFormatter: (params) => formatPrice(params.value),
            cellStyle: {
              textAlign: 'right',
              color: '#b91c1c',
            },
          },
          {
            field: 'putOI',
            headerName: 'OI',
            valueFormatter: (params) => formatVolume(params.value),
            cellStyle: { textAlign: 'right' },
          },
          {
            field: 'putVolume',
            headerName: 'Vol',
            valueFormatter: (params) => formatVolume(params.value),
            cellStyle: { textAlign: 'right' },
          },
        ],
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: false,
      resizable: true,
      suppressMovable: true,
      flex: 1,
      minWidth: 80,
    }),
    []
  );

  return (
    <div className="w-full p-4">
      <div className="ag-theme-quartz w-full" style={{ height: '600px' }}>
        <AgGridReact<OptionsRow>
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          headerHeight={32}
          rowHeight={28}
          suppressCellFocus={true}
          getRowClass={(params) => (params.data?.isATM ? 'ag-row-atm' : '')}
          domLayout="normal"
        />
        <style jsx global>{`
          .ag-theme-quartz .ag-row-atm {
            background-color: #fef3c7 !important;
          }
          .ag-theme-quartz {
            background-color: #2d2d2d;
          }
          .ag-theme-quartz .ag-header {
            background-color: #1a1a1a;
            color: #f0f0f0;
            font-family: 'Minecraft', Arial, sans-serif;
          }
          .ag-theme-quartz .ag-row {
            background-color: #2d2d2d;
            color: #f0f0f0;
            border-color: #4a4a4a;
          }
          .ag-theme-quartz .ag-row-odd {
            background-color: #333333;
          }
          .ag-theme-quartz .ag-root-wrapper {
            border: none;
          }
          .ag-theme-quartz .ag-pinned-left-cols-container.ag-hidden,
          .ag-theme-quartz .ag-pinned-right-cols-container.ag-hidden {
            display: none !important;
          }
        `}</style>
      </div>
    </div>
  );
}
