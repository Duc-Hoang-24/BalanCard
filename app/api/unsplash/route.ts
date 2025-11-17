import { NextRequest, NextResponse } from 'next/server';

type UnsplashPhoto = {
  urls: {
    small: string;
    regular: string;
  };
  alt_description: string | null;
}
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return NextResponse.json({ error: 'Unsplash key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&per_page=5&client_id=${accessKey}`
    );

    if (!response.ok) {
      throw new Error(`Unsplash API responded with ${response.status}`);
    }

    const data = await response.json();

    // Return only what we need to client
    const results = data.results.map((photo: UnsplashPhoto) => ({
      urls: {
        small: photo.urls.small,
        regular: photo.urls.regular,
      },
      alt: photo.alt_description || 'Unsplash image',
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Unsplash API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}