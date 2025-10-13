type ErrorNoticeProps = {
  message: string;
};

const ErrorNotice = ({ message }: ErrorNoticeProps) => (
  <div
    role="alert"
    style={{
      backgroundColor: 'rgba(248, 113, 113, 0.12)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#b91c1c',
      borderRadius: '14px',
      padding: '12px 16px',
      textAlign: 'center',
      fontWeight: 600,
      margin: '0 0 16px',
      width: '100%',
    }}
  >
    {message}
  </div>
);

export default ErrorNotice;

