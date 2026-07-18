type UpgradeDatabase = (
    database: IDBDatabase,
    event: IDBVersionChangeEvent,
) => void;
type TransactionOptions = {
    storeName: string;
    mode: IDBTransactionMode;
};

function $open(
    name: string,
    version: number,
    upgrade?: UpgradeDatabase,
): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, version);
        let upgradeError: unknown;
        request.onupgradeneeded = (event) => {
            try {
                upgrade?.(request.result, event);
            } catch (error) {
                upgradeError = error;
                request.transaction?.abort();
            }
        };
        request.onerror = () => {
            reject(
                upgradeError ??
                    request.error ??
                    new Error("Failed to open IndexedDB"),
            );
        };
        request.onsuccess = () => resolve(request.result);
    });
}

function $request<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onerror = () => {
            reject(request.error ?? new Error("IndexedDB request failed"));
        };
        request.onsuccess = () => resolve(request.result);
    });
}

function $transaction<T>(
    database: IDBDatabase,
    options: TransactionOptions,
    operation: (store: IDBObjectStore) => T | Promise<T>,
): Promise<T> {
    return new Promise((resolve, reject) => {
        let transaction: IDBTransaction;
        try {
            transaction = database.transaction(options.storeName, options.mode);
        } catch (error) {
            reject(error);
            return;
        }

        let operationFinished = false;
        let operationFailed = false;
        let operationError: unknown;
        let operationResult: T;
        transaction.oncomplete = () => {
            if (!operationFinished) {
                reject(
                    new Error(
                        "IndexedDB transaction completed before its operation",
                    ),
                );
                return;
            }
            resolve(operationResult);
        };
        transaction.onabort = () => {
            reject(
                operationFailed
                    ? operationError
                    : (transaction.error ??
                          new Error("IndexedDB transaction aborted")),
            );
        };
        transaction.onerror = () => undefined;

        void Promise.resolve()
            .then(() => operation(transaction.objectStore(options.storeName)))
            .then(
                (result) => {
                    operationResult = result;
                    operationFinished = true;
                },
                (error) => {
                    operationFailed = true;
                    operationError = error;
                    try {
                        transaction.abort();
                    } catch {
                        reject(error);
                    }
                },
            );
    });
}

export const $idb = Object.defineProperty(
    {
        open: $open,
        request: $request,
        transaction: $transaction,
    },
    "displayName",
    { value: "$idb" },
);
