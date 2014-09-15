_G.console = {
	log = function (this, ...)
		print(...)
	end
}

_G.empty = function () end

_G.String = function (this, arg)
	return tostring(arg)
end

_G.undefined = nil

_G.i = {i = 42}

local tbl = {}
debug.setmetatable(function () end, {
	__index = function (self, key)
		if not tbl[self] then
			tbl[self] = { prototype = {} }
		end
		return tbl[self][key]
	end,
	__newindex = function (self, key, val)
		if not tbl[self] then
			tbl[self] = { prototype = {} }
		end
		tbl[self][key] = val
	end,
})

_G.Array = function (this, ...)
	local args = {...}
	args[0] = table.remove(args, 1)
	args.length = select('#', ...)
	return args
end

local output
if arg[1] ~= nil then
	local file = assert(io.popen('./colonyjit-compiler ' .. arg[1], 'r'))
	output = file:read('*all')
	file:close()
else
	output = io.read("*a")
end

_G.global = _G
load(output)({
	typeof = function (arg)
		if arg == nil then return 'object'; end
		return type(arg)
	end,
	global = _G,
	["new"] = function (constructor, ...)
		local obj = {}
		setmetatable(obj, {
			__index = constructor.prototype
		})
		return constructor(obj, ...) or obj
	end
})
