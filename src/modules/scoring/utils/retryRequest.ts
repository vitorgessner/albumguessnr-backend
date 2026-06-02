const retryRequest = async (cb: () => void, retryTimes: number) => {
    for (let i = 0; i < retryTimes; i++) {
        try {
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(cb());
                }, 1000);
            });

            return;
        } catch (e) {
            console.log(e);
        }
    }

    console.error(`retried ${retryTimes} times but failed them all`);
};

export default retryRequest;
