type CompanyMapProps ={
    companyName?:string | null;
    statedLocation?: string | null;
};

export function CompanyMap({companyName,statedLocation}:CompanyMapProps){
    const name = companyName?.trim() ??'';
    const location = statedLocation?.trim() ?? '';

    if(!location){
        return <p>Location not provided. Add the job's stated city or address to search the map.</p>
    }

    const query = [name,location].filter(Boolean).join(',');
    const encodedQuery = encodeURIComponent(query);

    const mapUrl = `https://www.google.com/maps?q=${encodedQuery}&output=embed`;
    const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

    return (
                    <section aria-label="Company location search">
            <p>Map search for {query}. Check the address yourself; a pin does not verify the employer.</p>
            <iframe
                title={`Map search for ${query}`}
                src={mapUrl}
                width="100%"
                height="320"
                style={{ border: 0, marginTop: '0.75rem' }}
                 loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
            />
            <p>
                <a href={searchUrl} target="_blank" rel="noopener noreferrer">
                Open search in Google Maps
                </a>
            </p>
            </section>
        );


}




