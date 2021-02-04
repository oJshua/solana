use crate::rpc_config::RpcProgramAccountsConfig;
use crate::rpc_response::RpcKeyedAccount;
use std::collections::HashMap;
use std::time::{Duration, SystemTime};

#[derive(Debug, Clone)]
pub struct ProgramAccountsCache {
    cache: HashMap<ProgramAccountsCacheKey, ProgramAccountsCacheValue>,
}

#[derive(Debug, PartialEq, Eq, Hash, Clone)]
pub struct ProgramAccountsCacheKey {
    pub program_id: String,
    pub config: Option<RpcProgramAccountsConfig>,
}

#[derive(Debug, Clone)]
pub struct ProgramAccountsCacheValue {
    accounts: Vec<RpcKeyedAccount>,
    time: SystemTime,
}

impl ProgramAccountsCache {
    pub fn new(max: usize) -> Self {
        log::info!("INFO: NEW CACHE");
        Self {
            cache: HashMap::with_capacity(max),
        }
    }
    pub fn get(&self, key: &ProgramAccountsCacheKey) -> Option<Vec<RpcKeyedAccount>> {
        log::info!("INFO: {}", self.cache.len());

        if let Some(value) = self.cache.get(key) {
            if let Ok(elapsed) = value.time.elapsed() {
                if elapsed < Duration::from_secs(30) {
                    return Some(value.accounts);
                }
            }
        }

        None
    }
    pub fn put(&mut self, key: &ProgramAccountsCacheKey, value: &Vec<RpcKeyedAccount>) {
        let ret = self.cache.insert(
            key.clone(),
            ProgramAccountsCacheValue {
                accounts: value.clone(),
                time: SystemTime::now(),
            },
        );

        log::info!("INFO: {}", self.cache.len());

        log::info!("INFO: {:?}", ret);
    }
}
