type UserProfileErrorProps = {
  message: string;
  onRetry?: () => void;
};

export function UserProfileError({
  message,
  onRetry,
}: UserProfileErrorProps) {
  return (
    <div className="rounded-xl border border-red-900 bg-red-950/30 p-6">
      <h2 className="font-semibold text-red-200">
        Unable to load profile
      </h2>

      <p className="mt-2 text-sm text-red-300">
        {message}
      </p>

      {onRetry ? (
        <button
          type="button"
          onClick={() => {
            void onRetry();
          }}
          className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950"
        >
          Try Again
        </button>
      ) : null}
    </div>
  );
}