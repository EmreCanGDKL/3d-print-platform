import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function buildQueryString(searchParams: SearchParams) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
      return;
    }

    if (value) params.set(key, value);
  });

  return params.toString();
}

export default function AiCreatePage({ searchParams }: { searchParams: SearchParams }) {
  const queryString = buildQueryString(searchParams);
  redirect(queryString ? `/ai-generator?${queryString}` : '/ai-generator');
}
