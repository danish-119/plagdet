CC ?= gcc
PYTHON ?= python
CFLAGS ?= -O3 -std=c99 -fPIC
SRC = rolling_hash.c minhash_ops.c
BUILD_DIR = build

UNAME_S := $(shell uname -s 2>/dev/null)
UNAME_M := $(shell uname -m 2>/dev/null)

ifeq ($(OS),Windows_NT)
    EXT = dll
    TARGET_OS = windows
    ifeq ($(PROCESSOR_ARCHITECTURE),ARM64)
        TARGET_ARCH = arm64
    else
        TARGET_ARCH = amd64
    endif
    SHARED_FLAGS = -shared
else ifeq ($(UNAME_S),Darwin)
    EXT = dylib
    TARGET_OS = darwin
    ifeq ($(UNAME_M),arm64)
        TARGET_ARCH = arm64
    else
        TARGET_ARCH = amd64
    endif
    SHARED_FLAGS = -shared -undefined dynamic_lookup
else
    EXT = so
    TARGET_OS = linux
    ifeq ($(UNAME_M),aarch64)
        TARGET_ARCH = arm64
    else ifeq ($(UNAME_M),arm64)
        TARGET_ARCH = arm64
    else
        TARGET_ARCH = amd64
    endif
    SHARED_FLAGS = -shared
endif

TARGET = $(BUILD_DIR)/$(TARGET_OS)_$(TARGET_ARCH).$(EXT)

all: $(TARGET)

$(TARGET): $(SRC)
    $(PYTHON) -c "from pathlib import Path; Path(r'$(BUILD_DIR)').mkdir(parents=True, exist_ok=True)"
	$(CC) $(CFLAGS) $(SHARED_FLAGS) $(SRC) -o $(TARGET)

clean:
	rm -f $(BUILD_DIR)/*
