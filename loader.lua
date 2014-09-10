_G.console = {
	log = function (this, ...)
		print(...)
	end
}

_G.typeof = function (arg)
	if arg == nil then return 'object'; end
	return type(arg)
end

_G.empty = function () end

_G.String = function (arg)
	return tostring(arg)
end

_G.undefined = nil

_G.i = {i = 42}

local output
if arg[1] ~= nil then
	local file = assert(io.popen('./colonyjit-compiler ' .. arg[1], 'r'))
	output = file:read('*all')
	file:close()
else
	output = io.read("*a")
end
load(output)()
