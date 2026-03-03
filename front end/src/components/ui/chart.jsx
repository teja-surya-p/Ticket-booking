'use client';

import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '@/lib/utils';

// Format: { THEME_NAME: CSS_SELECTOR }
import "./chart.module.css";
const THEMES = {
  light: '',
  dark: '.dark'
};
const ChartContext = React.createContext(null);
function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }
  return context;
}
function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;
  return <ChartContext.Provider value={{
    config
  }}>
      <div data-slot="chart" data-chart={chartId} className={cn("chart-class-1", className)} {...props}>
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>;
}
const ChartStyle = ({
  id,
  config
}) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color);
  if (!colorConfig.length) {
    return null;
  }
  return <style dangerouslySetInnerHTML={{
    __html: Object.entries(THEMES).map(([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig.map(([key, itemConfig]) => {
      const color = itemConfig.theme?.[theme] || itemConfig.color;
      return color ? `  --color-${key}: ${color};` : null;
    }).join('\n')}
}
`).join('\n')
  }} />;
};
const ChartTooltip = RechartsPrimitive.Tooltip;
function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey
}) {
  const {
    config
  } = useChart();
  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }
    const [item] = payload;
    const key = `${labelKey || item?.dataKey || item?.name || 'value'}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value = !labelKey && typeof label === 'string' ? config[label]?.label || label : itemConfig?.label;
    if (labelFormatter) {
      return <div className={cn("chart-class-2", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>;
    }
    if (!value) {
      return null;
    }
    return <div className={cn("chart-class-2", labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);
  if (!active || !payload?.length) {
    return null;
  }
  const nestLabel = payload.length === 1 && indicator !== 'dot';
  return <div className={cn("chart-class-3", className)}>
      {!nestLabel ? tooltipLabel : null}
      <div className={"chart-class-4"}>
        {payload.map((item, index) => {
        const key = `${nameKey || item.name || item.dataKey || 'value'}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        const indicatorColor = color || item.payload.fill || item.color;
        return <div key={item.dataKey} className={cn("chart-class-5", indicator === 'dot' && "chart-class-6")}>
              {formatter && item?.value !== undefined && item.name ? formatter(item.value, item.name, item, index, item.payload) : <>
                  {itemConfig?.icon ? <itemConfig.icon /> : !hideIndicator && <div className={cn("chart-class-7", {
              ["chart-class-8"]: indicator === 'dot',
              ["chart-class-9"]: indicator === 'line',
              ["chart-class-10"]: indicator === 'dashed',
              ["chart-class-11"]: nestLabel && indicator === 'dashed'
            })} style={{
              '--color-bg': indicatorColor,
              '--color-border': indicatorColor
            }} />}
                  <div className={cn("chart-class-12", nestLabel ? "chart-class-13" : "chart-class-6")}>
                    <div className={"chart-class-4"}>
                      {nestLabel ? tooltipLabel : null}
                      <span className={"chart-class-14"}>
                        {itemConfig?.label || item.name}
                      </span>
                    </div>
                    {item.value && <span className={"chart-class-15"}>
                        {item.value.toLocaleString()}
                      </span>}
                  </div>
                </>}
            </div>;
      })}
      </div>
    </div>;
}
const ChartLegend = RechartsPrimitive.Legend;
function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey
}) {
  const {
    config
  } = useChart();
  if (!payload?.length) {
    return null;
  }
  return <div className={cn("chart-class-16", verticalAlign === 'top' ? "chart-class-17" : "chart-class-18", className)}>
      {payload.map(item => {
      const key = `${nameKey || item.dataKey || 'value'}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      return <div key={item.value} className={"chart-class-19"}>
            {itemConfig?.icon && !hideIcon ? <itemConfig.icon /> : <div className={"chart-class-20"} style={{
          backgroundColor: item.color
        }} />}
            {itemConfig?.label}
          </div>;
    })}
    </div>;
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config, payload, key) {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }
  const payloadPayload = 'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null ? payload.payload : undefined;
  let configLabelKey = key;
  if (key in payload && typeof payload[key] === 'string') {
    configLabelKey = payload[key];
  } else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key] === 'string') {
    configLabelKey = payloadPayload[key];
  }
  return configLabelKey in config ? config[configLabelKey] : config[key];
}
export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };
