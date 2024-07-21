interface FieldListRowData {
  label: string;
  space?: string;
  value: string;
}
interface FieldListProps extends BaseCompProps<HTMLDivElement> {
  data: FieldListRowData[];
  width?: string;
}

export function FieldList(props: FieldListProps) {
  const { data, ...otherProps } = props;
  let { width } = props;
  if (!width?.endsWith('px')) {
    width = `${width}em`;
  }

  let maxLabelLength = width || 0;

  if (maxLabelLength === 0) {
    data.forEach((item) => {
      maxLabelLength = Math.max(+maxLabelLength, item.label.length);
    });
  }

  const listDom = data.map((item, index) => {
    return (
      <div className="rounded mt-3" key={index}>
        <div className="text-justify text-last-justify inline-block" style={{ width }}>
          {item.label}
        </div>
        <span>{item.space ?? ':'}</span>
        <span className="w-auto">{item.value}</span>
      </div>
    );
  });

  return <div {...otherProps}>{listDom}</div>;
}