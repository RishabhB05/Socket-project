export const baseUrl = "http://localhost:5000/api";
export const postRequest = async(URL, body)=>{
    const response = await fetch(URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

if(!response.ok){
    let message;

    if(data?.message){
        message = data.message;
    }else{
        message = "An error occurred";
    }

    return {error: true, message: message};

}



return data;

};